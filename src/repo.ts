import { useLiveQuery } from 'dexie-react-hooks';
import {
  db, base, uuid7, type Exercise, type Plan, type PlanItem, type Workout, type WorkoutExercise,
  type WorkoutSet, type ExtraLog, type ExtraKind, type Settings, type Muscle, type Equipment, type LoadType
} from './db';

/** All screens read from one in-memory snapshot. A personal log stays small (a few thousand sets a year). */
export interface Data {
  exercises: Exercise[];
  plans: Plan[];
  planItems: PlanItem[];
  workouts: Workout[];
  workoutExercises: WorkoutExercise[];
  sets: WorkoutSet[];
  extraLogs: ExtraLog[];
  settings: Settings;
  ex: Map<string, Exercise>;
}

const live = <T extends { deletedAt: number | null }>(rows: T[]) => rows.filter((r) => r.deletedAt === null);

export async function loadData(): Promise<Data | null> {
  const [exercises, plans, planItems, workouts, workoutExercises, sets, extraLogs, settings] = await Promise.all([
    db.exercises.toArray(), db.plans.toArray(), db.planItems.toArray(), db.workouts.toArray(),
    db.workoutExercises.toArray(), db.sets.toArray(), db.extraLogs.toArray(), db.settings.get('settings')
  ]);
  if (!settings) return null;
  const ex = live(exercises);
  return {
    exercises: ex,
    plans: live(plans).sort((a, b) => a.sortOrder - b.sortOrder),
    planItems: live(planItems).sort((a, b) => a.sortOrder - b.sortOrder),
    workouts: live(workouts).sort((a, b) => a.startedAt - b.startedAt),
    workoutExercises: live(workoutExercises).sort((a, b) => a.sortOrder - b.sortOrder),
    sets: live(sets).sort((a, b) => a.position - b.position),
    extraLogs: live(extraLogs),
    settings,
    ex: new Map(ex.map((e) => [e.id, e]))
  };
}

export function useData() {
  return useLiveQuery(loadData, []);
}

const now = () => Date.now();
const upd = { get updatedAt() { return now(); } };

// ---------- queries over a snapshot ----------

export function activeWorkout(d: Data) {
  return d.workouts.find((w) => w.finishedAt === null) ?? null;
}

export function setsOf(d: Data, weId: string) {
  return d.sets.filter((s) => s.workoutExerciseId === weId);
}

export function exercisesOf(d: Data, workoutId: string) {
  return d.workoutExercises.filter((we) => we.workoutId === workoutId);
}

export function planItemsOf(d: Data, planId: string) {
  return d.planItems.filter((p) => p.planId === planId);
}

/** The most recent finished workout where this exercise has done sets (optionally ignoring one workout). */
export function lastPerformance(d: Data, exerciseId: string, excludeWorkoutId?: string) {
  const wById = new Map(d.workouts.map((w) => [w.id, w]));
  let best: { workout: Workout; we: WorkoutExercise; sets: WorkoutSet[] } | null = null;
  for (const we of d.workoutExercises) {
    if (we.exerciseId !== exerciseId || we.skipped || we.workoutId === excludeWorkoutId) continue;
    const w = wById.get(we.workoutId);
    if (!w || w.finishedAt === null) continue;
    const sets = setsOf(d, we.id).filter((s) => s.done);
    if (!sets.length) continue;
    if (!best || w.finishedAt > best.workout.finishedAt!) best = { workout: w, we, sets };
  }
  return best;
}

// ---------- workouts ----------

async function prefill(d: Data, weId: string, exerciseId: string, workoutId: string, count: number) {
  const last = lastPerformance(d, exerciseId, workoutId);
  const src = last?.sets ?? [];
  const n = Math.max(count, src.length);
  const rows: WorkoutSet[] = [];
  for (let i = 0; i < n; i++) {
    const s = src[i] ?? src[src.length - 1];
    rows.push({ ...base(), workoutExerciseId: weId, position: i, weightKg: s?.weightKg ?? 0, reps: s?.reps ?? 10, done: 0, doneAt: null });
  }
  await db.sets.bulkAdd(rows);
}

export async function startWorkout(d: Data, planId: string | null) {
  const plan = planId ? d.plans.find((p) => p.id === planId) : null;
  const w: Workout = { ...base(), planId, planName: plan?.name ?? '', startedAt: now(), finishedAt: null, note: '' };
  await db.transaction('rw', [db.workouts, db.workoutExercises, db.sets], async () => {
    await db.workouts.add(w);
    if (!plan) return;
    const items = planItemsOf(d, plan.id);
    const sids = new Map<string, string>();
    for (const [i, it] of items.entries()) {
      const sid = it.supersetId ? sids.get(it.supersetId) ?? sids.set(it.supersetId, uuid7()).get(it.supersetId)! : null;
      const we: WorkoutExercise = { ...base(), workoutId: w.id, exerciseId: it.exerciseId, sortOrder: i, replacedFromId: null, skipped: 0, note: '', supersetId: sid };
      await db.workoutExercises.add(we);
      await prefill(d, we.id, it.exerciseId, w.id, it.defaultSets);
    }
  });
  return w.id;
}

export async function addExerciseToWorkout(d: Data, workoutId: string, exerciseId: string) {
  const order = exercisesOf(d, workoutId).reduce((m, we) => Math.max(m, we.sortOrder), -1) + 1;
  const we: WorkoutExercise = { ...base(), workoutId, exerciseId, sortOrder: order, replacedFromId: null, skipped: 0, note: '', supersetId: null };
  await db.transaction('rw', [db.workoutExercises, db.sets], async () => {
    await db.workoutExercises.add(we);
    await prefill(d, we.id, exerciseId, workoutId, 3);
  });
  return we.id;
}

export async function updateSet(id: string, patch: Partial<Pick<WorkoutSet, 'weightKg' | 'reps'>>) {
  await db.sets.update(id, { ...patch, updatedAt: now() });
}

export async function toggleSet(s: WorkoutSet) {
  const done = s.done ? 0 : 1;
  await db.sets.update(s.id, { done, doneAt: done ? now() : null, updatedAt: now() });
}

export async function addSet(d: Data, weId: string) {
  const sets = setsOf(d, weId);
  const last = sets[sets.length - 1];
  await db.sets.add({ ...base(), workoutExerciseId: weId, position: (last?.position ?? -1) + 1, weightKg: last?.weightKg ?? 0, reps: last?.reps ?? 10, done: 0, doneAt: null });
}

export async function removeSet(id: string) {
  await db.sets.update(id, { deletedAt: now(), updatedAt: now() });
}

export async function setExerciseNote(weId: string, note: string) {
  await db.workoutExercises.update(weId, { note, ...upd });
}

export async function setSkipped(weId: string, skipped: boolean) {
  await db.workoutExercises.update(weId, { skipped: skipped ? 1 : 0, ...upd });
}

export async function moveToEnd(d: Data, we: WorkoutExercise) {
  const list = exercisesOf(d, we.workoutId);
  const rest = list.filter((x) => x.id !== we.id);
  await saveOrder('workoutExercises', [...rest, { ...we, supersetId: null }]);
}

/** One more round: a set for every exercise of the superset that is not skipped. */
export async function addRound(d: Data, members: WorkoutExercise[]) {
  for (const we of members) if (!we.skipped) await addSet(d, we.id);
}

/** Replace the exercise in a running workout; optionally also in the plan it came from. */
export async function swapExercise(d: Data, we: WorkoutExercise, newExerciseId: string, inPlan: boolean) {
  const w = d.workouts.find((x) => x.id === we.workoutId)!;
  await db.transaction('rw', [db.workoutExercises, db.sets, db.planItems], async () => {
    const old = setsOf(d, we.id);
    const count = Math.max(3, old.length);
    for (const s of old) await db.sets.update(s.id, { deletedAt: now(), updatedAt: now() });
    await db.workoutExercises.update(we.id, { exerciseId: newExerciseId, replacedFromId: we.replacedFromId ?? we.exerciseId, skipped: 0, ...upd });
    await prefill(d, we.id, newExerciseId, w.id, count);
    if (inPlan && w.planId) {
      const item = planItemsOf(d, w.planId).find((p) => p.exerciseId === we.exerciseId);
      if (item) await db.planItems.update(item.id, { exerciseId: newExerciseId, ...upd });
    }
  });
}

export async function finishWorkout(id: string) {
  await db.workouts.update(id, { finishedAt: now(), ...upd });
}

export async function setWorkoutNote(id: string, note: string) {
  await db.workouts.update(id, { note, ...upd });
}

export async function discardWorkout(d: Data, id: string) {
  const t = now();
  await db.transaction('rw', [db.workouts, db.workoutExercises, db.sets], async () => {
    for (const we of exercisesOf(d, id)) {
      for (const s of setsOf(d, we.id)) await db.sets.update(s.id, { deletedAt: t, updatedAt: t });
      await db.workoutExercises.update(we.id, { deletedAt: t, updatedAt: t });
    }
    await db.workouts.update(id, { deletedAt: t, updatedAt: t });
  });
}

// ---------- extras ----------

export function todayKey(date = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export async function toggleExtra(d: Data, kind: ExtraKind, date = todayKey()) {
  const hit = d.extraLogs.find((e) => e.date === date && e.kind === kind);
  if (hit) await db.extraLogs.update(hit.id, { deletedAt: now(), updatedAt: now() });
  else await db.extraLogs.add({ ...base(), date, kind });
}

// ---------- plans ----------

export async function createPlan(d: Data, name: string) {
  const order = d.plans.reduce((m, p) => Math.max(m, p.sortOrder), -1) + 1;
  const p: Plan = { ...base(), name, sortOrder: order, status: 'active' };
  await db.plans.add(p);
  return p.id;
}

export async function renamePlan(id: string, name: string) {
  await db.plans.update(id, { name, ...upd });
}

export async function setPlanStatus(id: string, status: Plan['status']) {
  await db.plans.update(id, { status, ...upd });
}

export async function deletePlan(d: Data, id: string) {
  const t = now();
  await db.transaction('rw', [db.plans, db.planItems], async () => {
    for (const it of planItemsOf(d, id)) await db.planItems.update(it.id, { deletedAt: t, updatedAt: t });
    await db.plans.update(id, { deletedAt: t, updatedAt: t });
  });
}

export async function duplicatePlan(d: Data, plan: Plan, name: string) {
  const id = await createPlan(d, name);
  const sids = new Map<string, string>();
  await db.planItems.bulkAdd(planItemsOf(d, plan.id).map((it, i) => ({
    ...base(), planId: id, exerciseId: it.exerciseId, sortOrder: i, defaultSets: it.defaultSets,
    supersetId: it.supersetId ? sids.get(it.supersetId) ?? sids.set(it.supersetId, uuid7()).get(it.supersetId)! : null
  })));
  return id;
}

export async function addPlanItem(d: Data, planId: string, exerciseId: string) {
  const order = planItemsOf(d, planId).reduce((m, p) => Math.max(m, p.sortOrder), -1) + 1;
  await db.planItems.add({ ...base(), planId, exerciseId, sortOrder: order, defaultSets: 3, supersetId: null });
}

export async function removePlanItem(d: Data, item: PlanItem) {
  await db.planItems.update(item.id, { deletedAt: now(), updatedAt: now() });
  await saveOrder('planItems', planItemsOf(d, item.planId).filter((x) => x.id !== item.id));
}

/** Moves a whole station (one exercise or a whole superset) past its neighbour station. */
export async function moveStation(d: Data, planId: string, stationIndex: number, dir: -1 | 1) {
  const st = stations(planItemsOf(d, planId));
  const j = stationIndex + dir;
  if (j < 0 || j >= st.length) return;
  [st[stationIndex], st[j]] = [st[j], st[stationIndex]];
  await saveOrder('planItems', st.flat());
}

// ---------- supersets ----------

type Linkable = { id: string; supersetId: string | null; sortOrder: number };

/** Groups an ordered list into stations: neighbours sharing a supersetId form one superset. */
export function stations<T extends Linkable>(list: T[]): T[][] {
  const out: T[][] = [];
  for (const it of list) {
    const last = out[out.length - 1];
    if (last && it.supersetId && last[0].supersetId === it.supersetId) last.push(it);
    else out.push([it]);
  }
  return out;
}

/** Writes order and cleans superset ids: a group of one is no group, a split group gets a new id. */
async function saveOrder<T extends Linkable>(table: 'planItems' | 'workoutExercises', list: T[]) {
  const seen = new Set<string>();
  const t = now();
  await db.transaction('rw', db.table(table), async () => {
    for (const st of stations(list)) {
      let sid = st[0].supersetId;
      if (st.length < 2) sid = null;
      else if (sid && seen.has(sid)) sid = uuid7();
      if (sid) seen.add(sid);
      for (const it of st) {
        const sortOrder = list.indexOf(it);
        // compare with what is stored: `list` may hold edited copies
        const stored = await db.table(table).get(it.id);
        if (stored && (stored.sortOrder !== sortOrder || stored.supersetId !== sid)) await db.table(table).update(it.id, { sortOrder, supersetId: sid, updatedAt: t });
      }
    }
  });
}

/** Links list[i] with list[i + 1] into one superset, or splits them if they are already linked. */
export async function toggleLink<T extends Linkable>(table: 'planItems' | 'workoutExercises', list: T[], i: number) {
  const a = list[i], b = list[i + 1];
  if (!a || !b) return;
  if (a.supersetId && a.supersetId === b.supersetId) {
    // the part of the group after the split point gets its own id (saveOrder drops it if only one is left)
    const fresh = uuid7();
    const out = list.slice();
    for (let k = i + 1; k < list.length && list[k].supersetId === a.supersetId; k++) out[k] = { ...list[k], supersetId: fresh };
    return saveOrder(table, out);
  }
  const sid = a.supersetId ?? b.supersetId ?? uuid7();
  const out = list.map((it) => (it === a || it === b || (b.supersetId && it.supersetId === b.supersetId) || (a.supersetId && it.supersetId === a.supersetId) ? { ...it, supersetId: sid } : it));
  return saveOrder(table, out);
}

export async function setDefaultSets(id: string, defaultSets: number) {
  await db.planItems.update(id, { defaultSets: Math.max(1, Math.min(10, defaultSets)), ...upd });
}

// ---------- exercises ----------

export async function createExercise(v: { nameDe: string; nameEn: string; muscle: Muscle; equipment: Equipment; gymNote: string }) {
  const loadType: LoadType = v.equipment === 'dumbbell' ? 'perHand' : v.equipment === 'bodyweight' ? 'bodyweightPlus' : 'weight';
  const weightStep = v.equipment === 'dumbbell' ? 2 : v.equipment === 'machine' ? 5 : 2.5;
  const e: Exercise = { ...base(), nameDe: v.nameDe, nameEn: v.nameEn || v.nameDe, muscle: v.muscle, equipment: v.equipment, loadType, weightStep, gymNote: v.gymNote, isMine: 1, isCustom: 1 };
  await db.exercises.add(e);
  return e.id;
}

export async function updateExercise(id: string, patch: Partial<Pick<Exercise, 'nameDe' | 'nameEn' | 'gymNote' | 'weightStep' | 'isMine'>>) {
  await db.exercises.update(id, { ...patch, ...upd });
}

// ---------- settings & backup ----------

export async function setLanguage(language: 'de' | 'en') {
  await db.settings.update('settings', { language, ...upd });
}

const TABLES = ['exercises', 'plans', 'planItems', 'workouts', 'workoutExercises', 'sets', 'extraLogs', 'settings'] as const;

export async function exportJson() {
  const out: Record<string, unknown> = { app: 'gymlog', version: 1, exportedAt: new Date().toISOString() };
  for (const t of TABLES) out[t] = await db.table(t).toArray();
  return JSON.stringify(out);
}

export async function importJson(text: string) {
  const data = JSON.parse(text);
  if (data.app !== 'gymlog') throw new Error('not a gymlog backup');
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      if (Array.isArray(data[t])) await db.table(t).bulkAdd(data[t]);
    }
  });
}
