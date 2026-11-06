import { db, base, uuid7, DEFAULT_SUPERSETS, type Exercise, type Muscle, type Equipment, type LoadType } from './db';

// [de, en, muscle, equipment, loadType, step, mine]
type Row = [string, string, Muscle, Equipment, LoadType, number, 0 | 1];

const LIB: Row[] = [
  // Default "mine" exercises
  ['Dips', 'Dips', 'chest', 'bodyweight', 'bodyweightPlus', 2.5, 1],
  ['Klimmzüge', 'Pull-ups', 'back', 'bodyweight', 'bodyweightPlus', 2.5, 1],
  ['Latzug', 'Lat Pulldown', 'back', 'machine', 'weight', 5, 1],
  ['Rudern Maschine', 'Seated Row', 'back', 'machine', 'weight', 5, 1],
  ['Butterfly', 'Pec Deck Fly', 'chest', 'machine', 'weight', 5, 1],
  ['Schrägbankdrücken KH', 'Incline Dumbbell Press', 'chest', 'dumbbell', 'perHand', 2, 1],
  ['Skullcrusher KH', 'Dumbbell Skull Crusher', 'arms', 'dumbbell', 'perHand', 2, 1],
  ['Bizepscurls KH', 'Dumbbell Biceps Curl', 'arms', 'dumbbell', 'perHand', 2, 1],
  ['Schulterdrücken KH', 'Dumbbell Shoulder Press', 'shoulders', 'dumbbell', 'perHand', 2, 1],
  ['Seitheben KH', 'Dumbbell Lateral Raise', 'shoulders', 'dumbbell', 'perHand', 2, 1],
  // Base library
  ['Bankdrücken', 'Bench Press', 'chest', 'barbell', 'weight', 2.5, 0],
  ['Bankdrücken KH', 'Dumbbell Bench Press', 'chest', 'dumbbell', 'perHand', 2, 0],
  ['Schrägbankdrücken LH', 'Incline Bench Press', 'chest', 'barbell', 'weight', 2.5, 0],
  ['Brustpresse', 'Chest Press', 'chest', 'machine', 'weight', 5, 0],
  ['Kabel Crossover', 'Cable Crossover', 'chest', 'cable', 'weight', 2.5, 0],
  ['Liegestütze', 'Push-ups', 'chest', 'bodyweight', 'bodyweightPlus', 2.5, 0],
  ['Kabelrudern', 'Cable Row', 'back', 'cable', 'weight', 5, 0],
  ['Langhantelrudern', 'Barbell Row', 'back', 'barbell', 'weight', 2.5, 0],
  ['KH-Rudern einarmig', 'One-Arm Dumbbell Row', 'back', 'dumbbell', 'perHand', 2, 0],
  ['Reverse Butterfly', 'Reverse Pec Deck', 'back', 'machine', 'weight', 5, 0],
  ['Kreuzheben', 'Deadlift', 'back', 'barbell', 'weight', 5, 0],
  ['Rückenstrecker', 'Back Extension', 'back', 'bodyweight', 'bodyweightPlus', 2.5, 0],
  ['Schulterpresse', 'Shoulder Press Machine', 'shoulders', 'machine', 'weight', 5, 0],
  ['Face Pulls', 'Face Pulls', 'shoulders', 'cable', 'weight', 2.5, 0],
  ['Seitheben Kabel', 'Cable Lateral Raise', 'shoulders', 'cable', 'weight', 2.5, 0],
  ['Frontheben KH', 'Dumbbell Front Raise', 'shoulders', 'dumbbell', 'perHand', 2, 0],
  ['Hammercurls', 'Hammer Curl', 'arms', 'dumbbell', 'perHand', 2, 0],
  ['Bizepscurl Maschine', 'Biceps Curl Machine', 'arms', 'machine', 'weight', 5, 0],
  ['Bizepscurl LH', 'Barbell Curl', 'arms', 'barbell', 'weight', 2.5, 0],
  ['Trizepsdrücken Kabel', 'Cable Triceps Pushdown', 'arms', 'cable', 'weight', 2.5, 0],
  ['Trizeps Überkopf KH', 'Overhead Dumbbell Extension', 'arms', 'dumbbell', 'perHand', 2, 0],
  ['Beinpresse', 'Leg Press', 'legs', 'machine', 'weight', 10, 0],
  ['Beinstrecker', 'Leg Extension', 'legs', 'machine', 'weight', 5, 0],
  ['Beinbeuger', 'Leg Curl', 'legs', 'machine', 'weight', 5, 0],
  ['Kniebeuge', 'Barbell Squat', 'legs', 'barbell', 'weight', 2.5, 0],
  ['Ausfallschritte KH', 'Dumbbell Lunges', 'legs', 'dumbbell', 'perHand', 2, 0],
  ['Wadenheben', 'Calf Raise', 'legs', 'machine', 'weight', 5, 0],
  ['Rumänisches Kreuzheben', 'Romanian Deadlift', 'legs', 'barbell', 'weight', 2.5, 0],
  ['Crunches', 'Crunches', 'core', 'bodyweight', 'bodyweightPlus', 2.5, 0],
  ['Beinheben hängend', 'Hanging Leg Raise', 'core', 'bodyweight', 'bodyweightPlus', 2.5, 0],
  ['Bauchmaschine', 'Ab Crunch Machine', 'core', 'machine', 'weight', 5, 0]
];

const PLANS: [string, 'active' | 'paused', string[]][] = [
  ['Push', 'active', ['Schrägbankdrücken KH', 'Dips', 'Butterfly', 'Schulterdrücken KH', 'Seitheben KH', 'Skullcrusher KH']],
  ['Pull', 'active', ['Klimmzüge', 'Latzug', 'Rudern Maschine', 'Bizepscurls KH', 'Seitheben KH']],
  ['Arme / Schultern', 'active', ['Schulterdrücken KH', 'Seitheben KH', 'Bizepscurls KH', 'Skullcrusher KH', 'Dips']],
  ['Ganzkörper', 'active', ['Klimmzüge', 'Dips', 'Schrägbankdrücken KH', 'Rudern Maschine']],
  ['Legs', 'paused', ['Beinpresse', 'Beinstrecker', 'Beinbeuger', 'Wadenheben']]
];

export async function seedIfEmpty() {
  await db.transaction('rw', [db.exercises, db.plans, db.planItems, db.settings], async () => {
    if ((await db.settings.count()) > 0) return;
    const byName = new Map<string, Exercise>();
    const exercises: Exercise[] = LIB.map(([nameDe, nameEn, muscle, equipment, loadType, weightStep, isMine]) => {
      const e: Exercise = { ...base(), nameDe, nameEn, muscle, equipment, loadType, weightStep, gymNote: '', isMine, isCustom: 0 };
      byName.set(nameDe, e);
      return e;
    });
    await db.exercises.bulkAdd(exercises);
    let order = 0;
    for (const [name, status, names] of PLANS) {
      const plan = { ...base(), name, sortOrder: order++, status };
      await db.plans.add(plan);
      const pair = DEFAULT_SUPERSETS.find(([p]) => p === name);
      const sid = pair ? uuid7() : null;
      await db.planItems.bulkAdd(
        names.map((n, i) => ({
          ...base(), planId: plan.id, exerciseId: byName.get(n)!.id, sortOrder: i, defaultSets: 3,
          supersetId: pair && (n === pair[1] || n === 'Seitheben KH') ? sid : null
        }))
      );
    }
    await db.settings.add({ ...base(), id: 'settings', language: 'de', gymName: '' });
  });
}
