import { useState } from 'react';
import { db, type Exercise, type Muscle, type Equipment } from '../db';
import { type Data, activeWorkout, addExerciseToWorkout, addPlanItem, createExercise, updateExercise, lastPerformance, setLanguage, planItemsOf } from '../repo';
import { useT, exName, setText, num } from '../i18n';
import { go } from '../App';
import { Icon, Sheet, Toaster, toast } from '../ui';
import { MusclePanel } from './MusclePanel';

const MUSCLES: Muscle[] = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'];
const EQUIP: Equipment[] = ['machine', 'dumbbell', 'barbell', 'cable', 'bodyweight'];

export function Library({ d, q }: { d: Data; q: URLSearchParams }) {
  const { t, lang } = useT();
  const pick = q.get('pick'); // 'workout' | 'plan:<id>'
  const planId = pick?.startsWith('plan:') ? pick.slice(5) : null;
  const [filter, setFilter] = useState<'mine' | Muscle>('mine');
  const [query, setQuery] = useState('');
  const [edit, setEdit] = useState<Exercise | 'new' | null>(null);

  const ql = query.trim().toLowerCase();
  const list = d.exercises
    .filter((e) => (ql ? `${e.nameDe} ${e.nameEn}`.toLowerCase().includes(ql) : filter === 'mine' ? e.isMine : e.muscle === filter))
    .sort((a, b) => exName(a, lang).localeCompare(exName(b, lang)));

  const inPlan = new Set(planId ? planItemsOf(d, planId).map((p) => p.exerciseId) : []);
  const backHref = planId ? `#/plans/${planId}` : pick === 'workout' ? '#/workout' : '#/plans';

  const choose = async (e: Exercise) => {
    if (pick === 'workout') {
      const w = activeWorkout(d);
      if (w) await addExerciseToWorkout(d, w.id, e.id);
      go('#/workout');
    } else if (planId) {
      await addPlanItem(d, planId, e.id);
      toast(`${exName(e, lang)} ${t.added2}`);
    } else setEdit(e);
  };

  return (
    <main className={`screen${pick ? ' no-nav' : ''}`}>
      <div className="between">
        <a className="link-btn" href={backHref}>← {pick ? t.back : t.plans}</a>
        <div className="seg" style={{ padding: 2 }}>
          <button className={lang === 'de' ? 'on' : ''} style={{ minHeight: 36, minWidth: 48 }} onClick={() => setLanguage('de')} aria-label="Deutsch">DE</button>
          <button className={lang === 'en' ? 'on' : ''} style={{ minHeight: 36, minWidth: 48 }} onClick={() => setLanguage('en')} aria-label="English">EN</button>
        </div>
      </div>
      <div className="between mt8" style={{ alignItems: 'flex-end' }}>
        <h1 className="h1">{pick ? t.pickExercise : t.exercises}</h1>
        <button className="btn sm" onClick={() => setEdit('new')}>+ {t.newEx}</button>
      </div>
      <label className="field mt12">{Icon.search()}<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search.toUpperCase()} aria-label={t.search} /></label>
      <div className="chips scroll mt12">
        <button className={`chip${filter === 'mine' && !ql ? ' on' : ''}`} onClick={() => { setFilter('mine'); setQuery(''); }}>{t.mine}</button>
        {MUSCLES.map((m) => <button key={m} className={`chip${filter === m && !ql ? ' on' : ''}`} onClick={() => { setFilter(m); setQuery(''); }}>{t.muscles[m]}</button>)}
      </div>

      <div className="list mt12">
        {list.map((e) => {
          const lp = lastPerformance(d, e.id);
          const already = inPlan.has(e.id);
          return (
            <div key={e.id} className="item">
              <button className="grow" style={{ background: 'none', border: 0, padding: '10px 0', textAlign: 'left', color: 'inherit' }} onClick={() => choose(e)}>
                <span className="title" style={{ display: 'block' }}>{exName(e, lang)}</span>
                <span className="sub" style={{ display: 'block' }}>{t.equip[e.equipment]}{e.gymNote ? ` · ${e.gymNote}` : ''}</span>
              </button>
              {!pick && e.isMine === 1 && filter !== 'mine' && <span className="tag">{t.mine}</span>}
              <span className="val">{lp ? setText(lp.sets[0], e.loadType, lang) : '—'}</span>
              {pick && (
                <button className={`roundbtn${already ? ' on' : ''}`} aria-label={exName(e, lang)} onClick={() => choose(e)}>{already ? '✓' : '+'}</button>
              )}
            </div>
          );
        })}
        {!list.length && <div className="empty">{t.nothingFound}</div>}
      </div>

      {planId && <a className="btn primary block mt24" href={backHref}>{t.finish}</a>}
      {edit && <EditSheet d={d} ex={edit === 'new' ? null : edit} initialName={edit === 'new' ? query : ''} onClose={() => setEdit(null)}
        onCreated={async (id) => { setEdit(null); const ex = await db.exercises.get(id); if (ex && pick) choose(ex); }} />}
      <Toaster />
    </main>
  );
}

function EditSheet({ d, ex, initialName, onClose, onCreated }: { d: Data; ex: Exercise | null; initialName: string; onClose: () => void; onCreated: (id: string) => void }) {
  const { t, lang } = useT();
  const [nameDe, setDe] = useState(ex?.nameDe ?? initialName);
  const [nameEn, setEn] = useState(ex?.nameEn ?? '');
  const [muscle, setMuscle] = useState<Muscle>(ex?.muscle ?? 'chest');
  const [equipment, setEquip] = useState<Equipment>(ex?.equipment ?? 'machine');
  const [gymNote, setNote] = useState(ex?.gymNote ?? '');
  const [step, setStep] = useState(ex ? num(ex.weightStep, lang) : '');
  const [mine, setMine] = useState(ex ? ex.isMine === 1 : true);

  const save = async () => {
    if (!nameDe.trim()) return;
    if (ex) {
      const s = parseFloat(step.replace(',', '.'));
      await updateExercise(ex.id, { nameDe: nameDe.trim(), nameEn: nameEn.trim() || nameDe.trim(), gymNote: gymNote.trim(), isMine: mine ? 1 : 0, ...(s > 0 ? { weightStep: s } : {}) });
      onClose();
    } else {
      onCreated(await createExercise({ nameDe: nameDe.trim(), nameEn: nameEn.trim(), muscle, equipment, gymNote: gymNote.trim() }));
    }
  };

  return (
    <Sheet onClose={onClose} label={ex ? exName(ex, lang) : t.newEx}>
      <div className="between">
        <span className="eyebrow">{ex ? t.exercises : t.newEx}</span>
        <button className="icon-btn" style={{ width: 44, height: 44 }} aria-label={t.cancel} onClick={onClose}>{Icon.close()}</button>
      </div>
      <label className="field"><span className="small" style={{ width: 120 }}>{t.nameDe}</span><input value={nameDe} onChange={(e) => setDe(e.target.value)} /></label>
      <label className="field"><span className="small" style={{ width: 120 }}>{t.nameEn}</span><input value={nameEn} onChange={(e) => setEn(e.target.value)} /></label>
      {!ex && (
        <>
          <label className="field"><span className="small" style={{ width: 120 }}>{t.muscle}</span>
            <select value={muscle} onChange={(e) => setMuscle(e.target.value as Muscle)}>{MUSCLES.map((m) => <option key={m} value={m}>{t.muscles[m]}</option>)}</select>
          </label>
          <label className="field"><span className="small" style={{ width: 120 }}>{t.equipment}</span>
            <select value={equipment} onChange={(e) => setEquip(e.target.value as Equipment)}>{EQUIP.map((m) => <option key={m} value={m}>{t.equip[m]}</option>)}</select>
          </label>
        </>
      )}
      <label className="field"><span className="small" style={{ width: 120 }}>{t.gymNote}</span><input value={gymNote} onChange={(e) => setNote(e.target.value)} /></label>
      {ex && (
        <>
          <label className="field"><span className="small" style={{ width: 120 }}>± KG</span><input inputMode="decimal" value={step} onChange={(e) => setStep(e.target.value)} /></label>
          <button className={`chip${mine ? ' hot' : ''}`} style={{ alignSelf: 'flex-start', minHeight: 44 }} aria-pressed={mine} onClick={() => setMine(!mine)}>{mine ? '✓ ' : ''}{t.inMine}</button>
        </>
      )}
      <button className="btn primary block" onClick={save} disabled={!nameDe.trim()}>{ex ? t.save : t.create}</button>
      {ex && <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}><MusclePanel ex={d.ex.get(ex.id) ?? ex} /></div>}
    </Sheet>
  );
}
