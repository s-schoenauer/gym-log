import type { Exercise, Muscle, WorkoutSet } from './db';
import { type Data, exercisesOf, setsOf, lastPerformance, todayKey } from './repo';

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

/** Best done set of an exercise across all finished workouts before `beforeTs`. */
export function prevBest(d: Data, exerciseId: string, beforeTs: number) {
  const wById = new Map(d.workouts.map((w) => [w.id, w]));
  let best: WorkoutSet | null = null;
  for (const we of d.workoutExercises) {
    if (we.exerciseId !== exerciseId) continue;
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
    const pb = prevBest(d, e.id, w.startedAt);
    const lp = lastPerformance(d, e.id, workoutId);
    results.push({ exercise: e, best, last: lp ? bestSet(lp.sets) : null, isPr: !!pb && beats(best, pb), prevBest: pb });
  }
  return { workout: w, minutes: Math.max(1, Math.round((end - w.startedAt) / 60000)), sets, volume: vol, results };
}

export type DayKind = 'none' | 'extra' | 'train' | 'pr';

/** Weeks × 7 days ending with the current week, Monday first. */
export function heatmap(d: Data, weeks = 12) {
  const kinds = new Map<string, DayKind>();
  for (const e of d.extraLogs) kinds.set(e.date, 'extra');
  for (const w of d.workouts) {
    if (!w.finishedAt) continue;
    const k = todayKey(new Date(w.startedAt));
    const s = workoutSummary(d, w.id);
    if (!s.sets) continue;
    const kind: DayKind = s.results.some((r) => r.isPr) ? 'pr' : 'train';
    if (kinds.get(k) !== 'pr') kinds.set(k, kind);
  }
  const today = new Date();
  today.setHours(12, 0, 0, 0);
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
  const trainings = d.workouts.filter((w) => w.finishedAt && w.startedAt >= from).length;
  return { days, trainings };
}

/** Best set per finished workout for one exercise, oldest first. */
export function exerciseHistory(d: Data, exerciseId: string) {
  const out: { ts: number; set: WorkoutSet }[] = [];
  for (const w of d.workouts) {
    if (!w.finishedAt) continue;
    for (const we of exercisesOf(d, w.id)) {
      if (we.exerciseId !== exerciseId) continue;
      const b = bestSet(doneSets(d, we.id));
      if (b) out.push({ ts: w.startedAt, set: b });
    }
  }
  return out;
}

export function setsPerMuscleThisWeek(d: Data) {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7)).getTime();
  const counts: Record<Muscle, number> = { chest: 0, back: 0, shoulders: 0, arms: 0, legs: 0, core: 0 };
  for (const w of d.workouts) {
    if (w.startedAt < monday) continue;
    for (const we of exercisesOf(d, w.id)) {
      const e = d.ex.get(we.exerciseId);
      if (e && !we.skipped) counts[e.muscle] += doneSets(d, we.id).length;
    }
  }
  return counts;
}

export function trainingsThisWeek(d: Data) {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7)).getTime();
  return d.workouts.filter((w) => w.finishedAt && w.startedAt >= monday).length;
}
