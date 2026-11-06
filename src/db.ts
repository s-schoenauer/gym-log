import Dexie, { type Table, type Transaction } from 'dexie';
import { USER_VARIANTS } from './evidence';

/** Fields every record carries, so a server sync can be added later without migrating data. */
export interface Base {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export type Muscle = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core';
export type Equipment = 'machine' | 'dumbbell' | 'barbell' | 'cable' | 'bodyweight';
/** weight = total load · perHand = dumbbell weight per hand · bodyweightPlus = added weight on top of bodyweight */
export type LoadType = 'weight' | 'perHand' | 'bodyweightPlus';
export type ExtraKind = 'stretch' | 'cardio' | 'run' | 'football';

export interface Exercise extends Base {
  nameDe: string;
  nameEn: string;
  muscle: Muscle;
  equipment: Equipment;
  loadType: LoadType;
  weightStep: number;
  gymNote: string;
  isMine: 0 | 1;
  isCustom: 0 | 1;
  /** Stable library key (slug of the English name) – links to the study-based muscle mapping. null for custom exercises. */
  key: string | null;
  /** Chosen execution variant, e.g. 'lean_forward' for dips. null = default. */
  variant: string | null;
  /** Own muscle mapping that overrides the library one. null = use the library mapping. */
  targets: Partial<Record<string, number>> | null;
}

export const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '');

export interface Plan extends Base {
  name: string;
  sortOrder: number;
  status: 'active' | 'paused';
}

export interface PlanItem extends Base {
  planId: string;
  exerciseId: string;
  sortOrder: number;
  defaultSets: number;
  /** Items next to each other with the same id form a superset (null = single exercise). */
  supersetId: string | null;
}

export interface Workout extends Base {
  planId: string | null;
  planName: string;
  startedAt: number;
  finishedAt: number | null;
  note: string;
}

export interface WorkoutExercise extends Base {
  workoutId: string;
  exerciseId: string;
  sortOrder: number;
  replacedFromId: string | null;
  skipped: 0 | 1;
  note: string;
  /** Copied from the plan when the workout starts; can be changed during the workout. */
  supersetId: string | null;
}

export interface WorkoutSet extends Base {
  workoutExerciseId: string;
  position: number;
  weightKg: number;
  reps: number;
  done: 0 | 1;
  doneAt: number | null;
}

export interface ExtraLog extends Base {
  date: string; // YYYY-MM-DD, local
  kind: ExtraKind;
}

export interface Settings extends Base {
  language: 'de' | 'en';
  gymName: string;
}

/** v3 data fix-up: library key, chosen variant and own mapping on every exercise. */
async function addMuscleFields(tx: Transaction) {
  await tx.table('exercises').toCollection().modify((e: Exercise) => {
    if (e.key === undefined) e.key = e.isCustom ? null : slug(e.nameEn);
    if (e.variant === undefined) e.variant = (e.key && USER_VARIANTS[e.key]) || null;
    if (e.targets === undefined) e.targets = null;
  });
}

/** [plan, partner exercise] – lateral raises are paired with the partner as a superset. */
export const DEFAULT_SUPERSETS: [string, string][] = [['Push', 'Schulterdrücken KH'], ['Pull', 'Bizepscurls KH']];

class GymDB extends Dexie {
  exercises!: Table<Exercise, string>;
  plans!: Table<Plan, string>;
  planItems!: Table<PlanItem, string>;
  workouts!: Table<Workout, string>;
  workoutExercises!: Table<WorkoutExercise, string>;
  sets!: Table<WorkoutSet, string>;
  extraLogs!: Table<ExtraLog, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('gymlog');
    this.version(1).stores({
      exercises: 'id, muscle, isMine, updatedAt',
      plans: 'id, sortOrder, updatedAt',
      planItems: 'id, planId, exerciseId, updatedAt',
      workouts: 'id, planId, startedAt, finishedAt, updatedAt',
      workoutExercises: 'id, workoutId, exerciseId, updatedAt',
      sets: 'id, workoutExerciseId, updatedAt',
      extraLogs: 'id, date, kind, updatedAt',
      settings: 'id, updatedAt'
    });
    // v2: supersets. Existing rows get supersetId = null; the user's two default supersets are set up.
    this.version(2).stores({}).upgrade(async (tx) => {
      const now = Date.now();
      await tx.table('planItems').toCollection().modify((r: PlanItem) => { if (r.supersetId === undefined) r.supersetId = null; });
      await tx.table('workoutExercises').toCollection().modify((r: WorkoutExercise) => { if (r.supersetId === undefined) r.supersetId = null; });
      const exercises: Exercise[] = await tx.table('exercises').toArray();
      const plans: Plan[] = await tx.table('plans').toArray();
      const byName = (n: string) => exercises.find((e) => e.nameDe === n && e.deletedAt === null);
      const lateral = byName('Seitheben KH');
      for (const [planName, partnerName] of DEFAULT_SUPERSETS) {
        const plan = plans.find((p) => p.name === planName && p.deletedAt === null);
        const partner = byName(partnerName);
        if (!plan || !partner || !lateral) continue;
        const items: PlanItem[] = (await tx.table('planItems').where('planId').equals(plan.id).toArray())
          .filter((i: PlanItem) => i.deletedAt === null).sort((a: PlanItem, b: PlanItem) => a.sortOrder - b.sortOrder);
        const a = items.find((i) => i.exerciseId === partner.id);
        if (!a) continue;
        const b = items.find((i) => i.exerciseId === lateral.id)
          ?? { ...base(), planId: plan.id, exerciseId: lateral.id, sortOrder: 0, defaultSets: a.defaultSets, supersetId: null };
        // new order: everything else as before, with [partner, lateral raises] where the partner was
        const rest = items.filter((i) => i !== a && i !== b);
        const at = rest.filter((i) => i.sortOrder < a.sortOrder).length;
        const ordered = [...rest.slice(0, at), a, b, ...rest.slice(at)];
        const sid = uuid7();
        for (const [i, it] of ordered.entries()) {
          await tx.table('planItems').put({ ...it, sortOrder: i, supersetId: it === a || it === b ? sid : it.supersetId, updatedAt: now });
        }
      }
    });
    // v3: study-based muscle mapping per exercise
    this.version(3).stores({}).upgrade(addMuscleFields);
  }
}


export const db = new GymDB();

/** UUID v7: random but sortable by creation time. */
export function uuid7(): string {
  const ts = Date.now();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) bytes[i] = Math.floor(ts / 2 ** (8 * (5 - i))) & 0xff;
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function base(): Base {
  const now = Date.now();
  return { id: uuid7(), createdAt: now, updatedAt: now, deletedAt: null };
}

export const alive = <T extends Base>(r: T | undefined): r is T => !!r && r.deletedAt === null;
