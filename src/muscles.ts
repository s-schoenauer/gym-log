import type { Muscle } from './db';

/** Sub-muscles used for detailed stats. Keys are stable (stored in data and in evidence.ts). */
export const SUB_MUSCLES = [
  'pec_clav', 'pec_sternal',
  'delt_ant', 'delt_lat', 'delt_post',
  'lats', 'traps_upper', 'upper_back', 'erectors',
  'biceps', 'brachialis', 'brachioradialis', 'tri_long', 'tri_lat_med', 'forearm_flex',
  'quads', 'rectus_femoris', 'hamstrings', 'glutes', 'adductors', 'calves',
  'abs', 'obliques'
] as const;

export type SubMuscle = (typeof SUB_MUSCLES)[number];
export type Targets = Partial<Record<SubMuscle, number>>;

/** Which coarse group each sub-muscle belongs to (for headings in stats). */
export const GROUP_OF: Record<SubMuscle, Muscle> = {
  pec_clav: 'chest', pec_sternal: 'chest',
  delt_ant: 'shoulders', delt_lat: 'shoulders', delt_post: 'shoulders',
  lats: 'back', traps_upper: 'back', upper_back: 'back', erectors: 'back',
  biceps: 'arms', brachialis: 'arms', brachioradialis: 'arms', tri_long: 'arms', tri_lat_med: 'arms', forearm_flex: 'arms',
  quads: 'legs', rectus_femoris: 'legs', hamstrings: 'legs', glutes: 'legs', adductors: 'legs', calves: 'legs',
  abs: 'core', obliques: 'core'
};

export const SUB_LABELS: Record<'de' | 'en', Record<SubMuscle, string>> = {
  de: {
    pec_clav: 'Obere Brust', pec_sternal: 'Mittlere/untere Brust',
    delt_ant: 'Vordere Schulter', delt_lat: 'Seitliche Schulter', delt_post: 'Hintere Schulter',
    lats: 'Latissimus', traps_upper: 'Oberer Trapez', upper_back: 'Oberer Rücken', erectors: 'Rückenstrecker',
    biceps: 'Bizeps', brachialis: 'Brachialis', brachioradialis: 'Brachioradialis', tri_long: 'Trizeps langer Kopf', tri_lat_med: 'Trizeps seitl./mittl. Kopf', forearm_flex: 'Unterarm',
    quads: 'Quadrizeps (Vasti)', rectus_femoris: 'Rectus femoris', hamstrings: 'Beinbeuger', glutes: 'Gesäß', adductors: 'Adduktoren', calves: 'Waden',
    abs: 'Gerader Bauch', obliques: 'Seitliche Bauchmuskeln'
  },
  en: {
    pec_clav: 'Upper chest', pec_sternal: 'Mid/lower chest',
    delt_ant: 'Front delts', delt_lat: 'Side delts', delt_post: 'Rear delts',
    lats: 'Lats', traps_upper: 'Upper traps', upper_back: 'Upper back', erectors: 'Spinal erectors',
    biceps: 'Biceps', brachialis: 'Brachialis', brachioradialis: 'Brachioradialis', tri_long: 'Triceps long head', tri_lat_med: 'Triceps lat./med. head', forearm_flex: 'Forearms',
    quads: 'Quads (vasti)', rectus_femoris: 'Rectus femoris', hamstrings: 'Hamstrings', glutes: 'Glutes', adductors: 'Adductors', calves: 'Calves',
    abs: 'Abs', obliques: 'Obliques'
  }
};

/** Short anatomy hint shown under the name. */
export const SUB_HINT: Record<'de' | 'en', Partial<Record<SubMuscle, string>>> = {
  de: {
    pec_clav: 'Pectoralis major, Pars clavicularis', pec_sternal: 'Pectoralis major, Pars sternocostalis',
    lats: 'inkl. Teres major', upper_back: 'Mittlerer/unterer Trapez + Rhomboiden', quads: 'Vastus lateralis, medialis, intermedius',
    rectus_femoris: 'zweigelenkiger Quadrizeps-Anteil', glutes: 'Gluteus maximus', calves: 'Gastrocnemius + Soleus'
  },
  en: {
    pec_clav: 'Pectoralis major, clavicular head', pec_sternal: 'Pectoralis major, sternocostal head',
    lats: 'incl. teres major', upper_back: 'Mid/lower traps + rhomboids', quads: 'Vastus lateralis, medialis, intermedius',
    rectus_femoris: 'two-joint part of the quads', glutes: 'Gluteus maximus', calves: 'Gastrocnemius + soleus'
  }
};

/** Fallback for custom exercises without a mapping: the whole coarse group counts as primary. */
export const GROUP_FALLBACK: Record<Muscle, Targets> = {
  chest: { pec_clav: 1, pec_sternal: 1, delt_ant: 0.5, tri_lat_med: 0.5 },
  back: { lats: 1, upper_back: 1, biceps: 0.5, delt_post: 0.5 },
  shoulders: { delt_ant: 1, delt_lat: 1, delt_post: 1 },
  arms: { biceps: 1, tri_long: 1, tri_lat_med: 1 },
  legs: { quads: 1, glutes: 1, hamstrings: 1 },
  core: { abs: 1, obliques: 1 }
};

/** Sources for how sets are counted (opened and checked). */
export const METHOD_SOURCES = {
  counting: {
    cite: 'Pelland JC, Remmert JF, Robinson ZP, Hinson S, Zourdos MC. The resistance training dose response: meta-regressions exploring the effects of weekly volume and frequency on muscle hypertrophy and strength gains. Sports Medicine 2026;56(2):481–505 (preprint SportRxiv 2024).',
    url: 'https://sportrxiv.org/index.php/server/preprint/download/460/967/908'
  },
  failure: {
    cite: 'Robinson ZP, Pelland JC, Remmert JF, et al. Exploring the dose-response relationship between estimated resistance training proximity to failure, strength gain, and muscle hypertrophy: a series of meta-regressions. Sports Medicine 2024;54(9):2209–2231.',
    url: 'https://doi.org/10.1007/s40279-024-02069-2'
  }
};
