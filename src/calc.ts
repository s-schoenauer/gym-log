import type { Exercise, WorkoutSet } from './db';
import { type Data, exercisesOf, setsOf, lastPerformance, todayKey, contextOfWe } from './repo';
import { trainingDate, dayTs, dayKey } from './day';
import { SUB_MUSCLES, GROUP_FALLBACK, type SubMuscle, type Targets } from './muscles';
import { EVIDENCE } from './evidence';

export type Pair = Pick<WorkoutSet, 'weightKg' | 'reps'>;

/** a beats b: more weight, or the same weight for more reps */
export const beats = (a: Pair, b: Pair) => a.weightKg > b.weightKg || (a.weightKg === b.weightKg && a.reps > b.reps);

export function bestSet<T extends Pair>(sets: T[]): T | null {
  return sets.reduce<T | null>((m, s) => (!m || beats(s, m) ? s : m), null);
}

export function volume(sets: Pair[], e: Exercise) {
  const f = e.loadType === 'perHand' ? 2 : 1;
  return sets.reduce((v, s) => v + s.weightKg * f * s.reps, 0);
}

export function doneSets(d: Data, weId: string) {
  return setsOf(d, weId).filter((s) => s.done);
}

/** Best done set of an exercise across all finished workouts before `beforeTs` (optionally only in one context). */
export function prevBest(d: Data, exerciseId: string, beforeTs: number, ctx?: string) {
  const wById = new Map(d.workouts.map((w) => [w.id, w]));
  let best: WorkoutSet | null = null;
  for (const we of d.workoutExercises) {
    if (we.exerciseId !== exerciseId) continue;
    if (ctx !== undefined && contextOfWe(d, we) !== ctx) continue;
    const w = wById.get(we.workoutId);
    if (!w?.finishedAt || w.finishedAt >= beforeTs) continue;
    const b = bestSet(doneSets(d, we.id));
    if (b && (!best || beats(b, best))) best = b;
  }
  return best;
}

export interface ExerciseResult {
  exercise: Exercise;
  best: WorkoutSet;
  last: WorkoutSet | null;
  isPr: boolean;
  prevBest: WorkoutSet | null;
  /** done sets this time and last time in the same context (in order) */
  sets: WorkoutSet[];
  lastSets: WorkoutSet[] | null;
  /** superset partners ('' = on its own); records and comparisons are within this context */
  ctx: string;
}

export function workoutSummary(d: Data, workoutId: string) {
  const w = d.workouts.find((x) => x.id === workoutId)!;
  const end = w.finishedAt ?? Date.now();
  let sets = 0, vol = 0;
  const results: ExerciseResult[] = [];
  for (const we of exercisesOf(d, workoutId)) {
    const e = d.ex.get(we.exerciseId);
    if (!e || we.skipped) continue;
    const ds = doneSets(d, we.id);
    if (!ds.length) continue;
    sets += ds.length;
    vol += volume(ds, e);
    const best = bestSet(ds)!;
    const ctx = contextOfWe(d, we);
    const pb = prevBest(d, e.id, w.startedAt, ctx);
    const lp = lastPerformance(d, e.id, workoutId, ctx);
    results.push({ exercise: e, best, last: lp?.sameCtx ? bestSet(lp.sets) : null, isPr: !!pb && beats(best, pb), prevBest: pb, ctx,
      sets: ds, lastSets: lp?.sameCtx ? lp.sets : null });
  }
  return { workout: w, minutes: Math.max(1, Math.round((end - w.startedAt) / 60000)), sets, volume: vol, results };
}

export interface SetChange { kgUp: number; kgDown: number; repsUp: number; repsDown: number; setsDiff: number; perSet: (Pair & { dKg: number; dReps: number } | null)[] }

/**
 * Set-by-set comparison with last time (same position). For a set with the same weight the reps
 * difference counts; with a different weight the weight difference counts. Extra or missing sets
 * are counted separately. So +1 rep in set 3 shows up even if the best set did not change.
 */
export function compareSets(cur: Pair[], prev: Pair[]): SetChange {
  const c: SetChange = { kgUp: 0, kgDown: 0, repsUp: 0, repsDown: 0, setsDiff: cur.length - prev.length, perSet: [] };
  cur.forEach((s, i) => {
    const p = prev[i];
    if (!p) { c.perSet.push(null); return; }
    const dKg = Math.round((s.weightKg - p.weightKg) * 100) / 100;
    const dReps = dKg === 0 ? s.reps - p.reps : 0;
    if (dKg > 0) c.kgUp = Math.max(c.kgUp, dKg);
    if (dKg < 0) c.kgDown = Math.max(c.kgDown, -dKg);
    if (dReps > 0) c.repsUp += dReps;
    if (dReps < 0) c.repsDown += -dReps;
    c.perSet.push({ weightKg: s.weightKg, reps: s.reps, dKg, dReps });
  });
  return c;
}

export type DayKind = 'none' | 'extra' | 'train' | 'pr';

/** Weeks × 7 days ending with the current week, Monday first. */
export function heatmap(d: Data, weeks = 12) {
  const kinds = new Map<string, DayKind>();
  for (const e of d.extraLogs) kinds.set(e.date, 'extra');
  for (const w of d.workouts) {
    if (!w.finishedAt) continue;
    const k = dayKey(w.startedAt);
    const s = workoutSummary(d, w.id);
    if (!s.sets) continue;
    const kind: DayKind = s.results.some((r) => r.isPr) ? 'pr' : 'train';
    if (kinds.get(k) !== 'pr') kinds.set(k, kind);
  }
  const today = trainingDate();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) - (weeks - 1) * 7);
  const days: { key: string; kind: DayKind; future: boolean }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    const key = todayKey(dt);
    days.push({ key, kind: kinds.get(key) ?? 'none', future: dt > today });
  }
  const from = monday.getTime() - 12 * 3600e3;
  const trainings = d.workouts.filter((w) => w.finishedAt && dayTs(w.startedAt) >= from).length;
  return { days, trainings };
}

/** Best set per finished workout for one exercise, oldest first, with its context. */
export function exerciseHistory(d: Data, exerciseId: string) {
  const out: { ts: number; set: WorkoutSet; ctx: string }[] = [];
  for (const w of d.workouts) {
    if (!w.finishedAt) continue;
    for (const we of exercisesOf(d, w.id)) {
      if (we.exerciseId !== exerciseId) continue;
      const b = bestSet(doneSets(d, we.id));
      if (b) out.push({ ts: w.startedAt, set: b, ctx: contextOfWe(d, we) });
    }
  }
  return out;
}

/** Muscle mapping used for stats: own override → chosen study variant → default variant → coarse group fallback. */
export function effectiveTargets(e: Exercise): Targets {
  if (e.targets && Object.keys(e.targets).length) return e.targets as Targets;
  const ev = e.key ? EVIDENCE[e.key] : undefined;
  if (ev) return (ev.variants.find((v) => v.key === e.variant) ?? ev.variants[0]).targets;
  return GROUP_FALLBACK[e.muscle];
}

export function variantOf(e: Exercise) {
  const ev = e.key ? EVIDENCE[e.key] : undefined;
  return ev ? ev.variants.find((v) => v.key === e.variant) ?? ev.variants[0] : null;
}

export function mondayOf(date: Date, weeksBack = 0) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7) - weeksBack * 7).getTime();
}

export interface SubStat { sets: number; parts: { exercise: Exercise; sets: number; weight: number }[] }

export type Period = 'week' | '7d' | 'month' | '30d';
export const PERIODS: Period[] = ['week', '7d', 'month', '30d'];

/** Start of a period: calendar week (Mon) / month (1st) or rolling 7 / 30 days including today. */
export function periodStart(p: Period, now: Date = trainingDate()) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (p === 'week') return mondayOf(now);
  if (p === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  day.setDate(day.getDate() - (p === '7d' ? 6 : 29));
  return day.getTime();
}

/** Days covered so far (for a per-week average). */
export const periodDays = (p: Period, now: Date = trainingDate()) =>
  Math.max(1, Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - periodStart(p, now)) / 864e5) + 1);

/**
 * Sets per sub-muscle in a period. A done set counts with the exercise's weight for that muscle
 * (1 = direct, 0.5 = indirect).
 */
export function subMuscleSets(d: Data, p: Period) {
  const from = periodStart(p);
  const out = Object.fromEntries(SUB_MUSCLES.map((m) => [m, { sets: 0, parts: [] } as SubStat])) as Record<SubMuscle, SubStat>;
  const counts = new Map<string, number>();
  for (const w of d.workouts) {
    if (dayTs(w.startedAt) < from) continue;
    for (const we of exercisesOf(d, w.id)) {
      if (we.skipped) continue;
      const n = doneSets(d, we.id).length;
      if (n) counts.set(we.exerciseId, (counts.get(we.exerciseId) ?? 0) + n);
    }
  }
  for (const [exId, n] of counts) {
    const e = d.ex.get(exId);
    if (!e) continue;
    for (const [m, wgt] of Object.entries(effectiveTargets(e)) as [SubMuscle, number][]) {
      if (!out[m] || !wgt) continue;
      out[m].sets += n * wgt;
      out[m].parts.push({ exercise: e, sets: n, weight: wgt });
    }
  }
  for (const m of SUB_MUSCLES) out[m].parts.sort((a, b) => b.sets * b.weight - a.sets * a.weight);
  return out;
}

