import { createContext, useContext } from 'react';
import type { Exercise, Muscle, Equipment, ExtraKind, LoadType } from './db';

export type Lang = 'de' | 'en';

const de = {
  today: 'Heute', log: 'Log', stats: 'Stats', plans: 'Pläne', settings: 'Einstellungen',
  whatsUp: 'Was steht an?', start: 'starten', free: 'Freier Tag', freeShort: 'Frei', emptyStart: 'leer starten',
  exercises: 'Übungen', exercisesN: (n: number) => `${n} Übung${n === 1 ? '' : 'en'}`, lastOn: (d: string) => `zuletzt ${d}`,
  extras: 'Extras', continueWorkout: 'Weiter trainieren', running: 'läuft',
  finish: 'Fertig', set: 'Satz', addSet: '+ Satz', addNote: '+ Notiz', note: 'Notiz', reps: 'Wdh', kg: 'KG',
  perHand: 'KG / HAND', added: 'ZUSATZ', addedKg: 'KG ZUSATZ',
  lastTime: 'Letztes Mal', firstTime: 'Zum ersten Mal – Werte einfach anpassen.',
  hintPerHand: 'Gewicht = pro Kurzhantel', hintBw: 'Körpergewicht · Zusatzgewicht optional',
  next: 'Weiter', lastExercise: 'Workout beenden', removeSet: 'Satz löschen',
  swapTitle: (n: string) => `${n} ersetzen`, swapHead: 'Gerät besetzt?', onlyToday: 'Nur heute', inPlan: 'In Vorlage',
  sameMuscle: 'Gleicher Muskel', skip: 'Weglassen', unskip: 'Doch machen', toEnd: 'Ans Ende', skipped: 'weggelassen',
  search: 'Suchen', newEx: 'Neu', mine: 'Meine', all: 'Alle',
  done: 'Durch.', minutes: 'Minuten', sets: 'Sätze', volume: 'Volumen', newRecord: 'Neuer Rekord',
  before: 'vorher', vsLast: 'Vs. letztes Mal', same: 'Gleich', newEntry: 'Neu', save: 'Speichern', workoutNote: 'Notiz zum Training',
  weeks12: 'Letzte 12 Wochen', trainings: (n: number) => `${n} Training${n === 1 ? '' : 's'}`, training: 'Training', withPr: 'mit PR', onlyExtras: 'nur Extras',
  bestSet: 'Bester Satz', noData: 'Noch keine Daten', setsPerMuscle: 'Sätze / Muskel · diese Woche',
  thisWeek: 'diese Woche', newPlan: '+ Neuer Plan', planName: 'Name des Plans', duplicate: 'Duplizieren', addExercise: '+ Übung',
  paused: 'Pausiert', active: 'Aktiv', pause: 'Pausieren', activate: 'Aktivieren', rename: 'Umbenennen', delete: 'Löschen',
  confirmDelete: 'Wirklich löschen?', setsShort: 'Sätze', cancel: 'Abbrechen', create: 'Anlegen', back: 'Zurück',
  nameDe: 'Name (Deutsch)', nameEn: 'Name (Englisch)', muscle: 'Muskel', equipment: 'Equipment', gymNote: 'Notiz (z. B. Sitz 4)',
  language: 'Sprache', backup: 'Backup', exportBtn: 'Exportieren', importBtn: 'Importieren', importOk: 'Import fertig.', importFail: 'Datei konnte nicht gelesen werden.',
  backupHint: 'Deine Daten liegen nur auf diesem Gerät. Exportiere ab und zu eine Sicherung.',
  persistOk: 'Speicher dauerhaft geschützt', persistNo: 'Speicher nicht dauerhaft – App zum Home-Bildschirm hinzufügen',
  discard: 'Workout verwerfen', confirmDiscard: 'Workout verwerfen? Alle Sätze gehen verloren.',
  pickExercise: 'Übung wählen', inMine: 'In „Meine“', freeHint: 'Kein Plan. Einfach machen, was sich gut anfühlt.',
  addFromLib: '+ Übung aus Bibliothek', recent: 'Zuletzt gemacht', saveAsPlan: 'Als Plan speichern', savedAsPlan: '✓ Als Plan gespeichert',
  noExercises: 'Noch keine Übung. Füg eine hinzu.', nothingFound: 'Nichts gefunden.', added2: 'hinzugefügt',
  trains: 'Trainiert', muscleDetail: 'Muskeln im Detail', periods: { week: 'Diese Woche', '7d': '7 Tage', month: 'Monat', '30d': '30 Tage' } as Record<string, string>, perWeek: 'pro Woche', whereFrom: 'Woher die Sätze kommen', direct: 'direkt', indirect: 'unterstützend',
  countingNote: 'Ein Satz zählt 1 für direkt trainierte Muskeln und 0,5 für unterstützende.', countingSource: 'Zählweise nach Pelland et al. 2024',
  countingFull: 'Alle Sätze zählen voll; grau = Muskel hat nur unterstützt.',
  noSetsMuscle: 'In diesem Zeitraum noch keine Sätze.', execution: 'Ausführung', musclesTitle: 'Muskeln', ownMapping: 'Eigene Zuordnung',
  resetMapping: 'Auf Studienstand zurücksetzen', cycleHint: 'Antippen: aus → ½ → 1', sources: 'Quellen', mythCheck: 'Mythen-Check',
  basis: { hypertrophy: 'Muskelwachstum gemessen (MRT/Ultraschall)', emg: 'Muskelaktivität gemessen (EMG)', biomech: 'Anatomie/Biomechanik, keine direkte Studie', mixed: 'Mehrere Studienarten' } as Record<string, string>,
  noEvidence: 'Eigene Übung: Zuordnung nach Muskelgruppe. Tippe die Muskeln an, um sie anzupassen.',
  superset: 'Supersatz', round: 'Runde', addRound: '+ Runde', linkNext: 'Supersatz mit nächster', linkPrev: 'Supersatz mit vorheriger',
  unlink: 'Supersatz lösen', makeSuperset: 'Supersatz', supersetHint: 'Immer abwechselnd: A, dann B, dann Pause.',
  dayShort: ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'],
  months: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
  weekdays: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  muscles: { chest: 'Brust', back: 'Rücken', shoulders: 'Schulter', arms: 'Arme', legs: 'Beine', core: 'Bauch' } as Record<Muscle, string>,
  equip: { machine: 'Maschine', dumbbell: 'Kurzhantel', barbell: 'Langhantel', cable: 'Kabelzug', bodyweight: 'Körpergewicht' } as Record<Equipment, string>,
  extrasL: { stretch: 'Dehnen', cardio: 'Cardio', run: 'Laufen', football: 'Fußball' } as Record<ExtraKind, string>
};

type Dict = typeof de;

const en: Dict = {
  today: 'Today', log: 'Log', stats: 'Stats', plans: 'Plans', settings: 'Settings',
  whatsUp: "What's on?", start: 'start', free: 'Free day', freeShort: 'Free', emptyStart: 'start empty',
  exercises: 'Exercises', exercisesN: (n) => `${n} exercise${n === 1 ? '' : 's'}`, lastOn: (d) => `last ${d}`,
  extras: 'Extras', continueWorkout: 'Continue workout', running: 'running',
  finish: 'Finish', set: 'Set', addSet: '+ Set', addNote: '+ Note', note: 'Note', reps: 'Reps', kg: 'KG',
  perHand: 'KG / HAND', added: 'ADDED', addedKg: 'KG ADDED',
  lastTime: 'Last time', firstTime: 'First time – just adjust the values.',
  hintPerHand: 'Weight = per dumbbell', hintBw: 'Bodyweight · added weight optional',
  next: 'Next', lastExercise: 'Finish workout', removeSet: 'Delete set',
  swapTitle: (n) => `Replace ${n}`, swapHead: 'Machine taken?', onlyToday: 'Today only', inPlan: 'In plan',
  sameMuscle: 'Same muscle', skip: 'Skip', unskip: 'Do it after all', toEnd: 'Move to end', skipped: 'skipped',
  search: 'Search', newEx: 'New', mine: 'Mine', all: 'All',
  done: 'Done.', minutes: 'Minutes', sets: 'Sets', volume: 'Volume', newRecord: 'New record',
  before: 'before', vsLast: 'Vs. last time', same: 'Same', newEntry: 'New', save: 'Save', workoutNote: 'Workout note',
  weeks12: 'Last 12 weeks', trainings: (n) => `${n} workout${n === 1 ? '' : 's'}`, training: 'Workout', withPr: 'with PR', onlyExtras: 'extras only',
  bestSet: 'Best set', noData: 'No data yet', setsPerMuscle: 'Sets / muscle · this week',
  thisWeek: 'this week', newPlan: '+ New plan', planName: 'Plan name', duplicate: 'Duplicate', addExercise: '+ Exercise',
  paused: 'Paused', active: 'Active', pause: 'Pause', activate: 'Activate', rename: 'Rename', delete: 'Delete',
  confirmDelete: 'Really delete?', setsShort: 'sets', cancel: 'Cancel', create: 'Create', back: 'Back',
  nameDe: 'Name (German)', nameEn: 'Name (English)', muscle: 'Muscle', equipment: 'Equipment', gymNote: 'Note (e.g. seat 4)',
  language: 'Language', backup: 'Backup', exportBtn: 'Export', importBtn: 'Import', importOk: 'Import done.', importFail: 'Could not read the file.',
  backupHint: 'Your data lives only on this device. Export a backup now and then.',
  persistOk: 'Storage protected', persistNo: 'Storage not persistent – add the app to your home screen',
  discard: 'Discard workout', confirmDiscard: 'Discard workout? All sets will be lost.',
  pickExercise: 'Pick exercise', inMine: 'In “Mine”', freeHint: 'No plan. Just do what feels right.',
  addFromLib: '+ Exercise from library', recent: 'Recently done', saveAsPlan: 'Save as plan', savedAsPlan: '✓ Saved as plan',
  noExercises: 'No exercise yet. Add one.', nothingFound: 'Nothing found.', added2: 'added',
  trains: 'Trains', muscleDetail: 'Muscles in detail', periods: { week: 'This week', '7d': '7 days', month: 'Month', '30d': '30 days' }, perWeek: 'per week', whereFrom: 'Where the sets come from', direct: 'direct', indirect: 'indirect',
  countingNote: 'A set counts 1 for directly trained muscles and 0.5 for assisting ones.', countingSource: 'Counting after Pelland et al. 2024',
  countingFull: 'All sets count fully; grey = the muscle only assisted.',
  noSetsMuscle: 'No sets in this period yet.', execution: 'Execution', musclesTitle: 'Muscles', ownMapping: 'Own mapping',
  resetMapping: 'Reset to study-based mapping', cycleHint: 'Tap: off → ½ → 1', sources: 'Sources', mythCheck: 'Myth check',
  basis: { hypertrophy: 'Muscle growth measured (MRI/ultrasound)', emg: 'Muscle activity measured (EMG)', biomech: 'Anatomy/biomechanics, no direct study', mixed: 'Several study types' },
  noEvidence: 'Custom exercise: mapped by muscle group. Tap muscles to adjust.',
  superset: 'Superset', round: 'Round', addRound: '+ Round', linkNext: 'Superset with next', linkPrev: 'Superset with previous',
  unlink: 'Unlink superset', makeSuperset: 'Superset', supersetHint: 'Alternate: A, then B, then rest.',
  dayShort: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'],
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  muscles: { chest: 'Chest', back: 'Back', shoulders: 'Shoulders', arms: 'Arms', legs: 'Legs', core: 'Core' },
  equip: { machine: 'Machine', dumbbell: 'Dumbbell', barbell: 'Barbell', cable: 'Cable', bodyweight: 'Bodyweight' },
  extrasL: { stretch: 'Stretch', cardio: 'Cardio', run: 'Run', football: 'Football' }
};

export const dicts = { de, en };
export const LangCtx = createContext<Lang>('de');

export function useT() {
  const lang = useContext(LangCtx);
  return { t: dicts[lang], lang };
}

export const exName = (e: Exercise | undefined, lang: Lang) => (e ? (lang === 'en' ? e.nameEn || e.nameDe : e.nameDe) : '?');

export const num = (n: number, lang: Lang) => {
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return lang === 'de' ? s.replace('.', ',') : s;
};

/** "26×8", "+0×12" for bodyweight exercises */
export const setText = (s: { weightKg: number; reps: number }, loadType: LoadType, lang: Lang) =>
  `${loadType === 'bodyweightPlus' ? '+' : ''}${num(s.weightKg, lang)}×${s.reps}`;

export const shortDate = (ts: number, lang: Lang) => {
  const d = new Date(ts);
  return `${d.getDate()}. ${dicts[lang].months[d.getMonth()]}`;
};
