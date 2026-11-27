import { useState } from 'react';
import { type Data, exercisesOf, setsOf, stations, contextOfWe, updateSet, removeSet, toggleSet, discardWorkout, setWorkoutNote } from '../repo';
import { trainingDate, dayKey } from '../day';
import { workoutSummary } from '../calc';
import { useT, exName, num } from '../i18n';
import { go } from '../App';
import { ask, NumField } from '../ui';

const LETTERS = 'ABCDEFGH';

const fmtDay = (ts: number, t: ReturnType<typeof useT>['t']) => {
  const d = trainingDate(ts);
  return `${t.weekdays[d.getDay()].slice(0, 2)} ${d.getDate()}. ${t.months[d.getMonth()]}`;
};
const fmtTime = (ts: number) => { const d = new Date(ts); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };

/** All finished workouts, newest first, grouped by month. */
export function History({ d }: { d: Data }) {
  const { t } = useT();
  const done = d.workouts.filter((w) => w.finishedAt).sort((a, b) => b.startedAt - a.startedAt);
  const months: { label: string; items: typeof done }[] = [];
  for (const w of done) {
    const dt = trainingDate(w.startedAt);
    const label = `${t.months[dt.getMonth()]} ${dt.getFullYear()}`;
    if (months[months.length - 1]?.label !== label) months.push({ label, items: [] });
    months[months.length - 1].items.push(w);
  }

  return (
    <main className="screen">
      <a className="link-btn" href="#/stats">← {t.stats}</a>
      <h1 className="h1 mt8">{t.history}</h1>
      {!done.length && <p className="empty">{t.noWorkouts}</p>}
      {months.map((m) => (
        <section key={m.label} className="stack mt24" aria-label={m.label}>
          <span className="eyebrow">{m.label} · {t.trainings(m.items.length)}</span>
          <div className="list mt8">
            {m.items.map((w) => {
              const s = workoutSummary(d, w.id);
              const prs = s.results.filter((r) => r.isPr).length;
              return (
                <a key={w.id} href={`#/session/${w.id}`} className="item" style={{ textDecoration: 'none', padding: '8px 0' }}>
                  <span className="grow">
                    <span className="title" style={{ display: 'block' }}>{w.planName || t.freeShort}</span>
                    <span className="sub" style={{ display: 'block' }}>{fmtDay(w.startedAt, t)} · {s.minutes} min · {s.sets} {t.sets}</span>
                  </span>
                  {prs > 0 && <span className="tag">{prs} {prs === 1 ? 'PR' : 'PRs'}</span>}
                  <span className="val" aria-hidden="true">›</span>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}

/** One past workout: every exercise with its sets; edit mode to correct values or delete. */
export function Session({ d, id }: { d: Data; id: string }) {
  const { t, lang } = useT();
  const [edit, setEdit] = useState(false);
  const w = d.workouts.find((x) => x.id === id);
  if (!w) {
    return <main className="screen"><a className="link-btn" href="#/history">← {t.history}</a><p className="empty">{t.noWorkouts}</p></main>;
  }
  const sum = workoutSummary(d, w.id);
  const prIds = new Set(sum.results.filter((r) => r.isPr).map((r) => r.exercise.id + r.ctx));
  const st = stations(exercisesOf(d, w.id));
  const extras = d.extraLogs.filter((e) => e.date === dayKey(w.startedAt));
  const vol = sum.volume >= 1000 ? `${num(Math.round(sum.volume / 100) / 10, lang)}T` : `${num(Math.round(sum.volume), lang)}`;

  const del = async () => {
    if (await ask.confirm(t.confirmDeleteWorkout)) { await discardWorkout(d, w.id); go('#/history'); }
  };

  return (
    <main className="screen">
      <div className="between">
        <a className="link-btn" href="#/history">← {t.history}</a>
        <button className={`btn sm${edit ? ' hot' : ''}`} aria-pressed={edit} onClick={() => setEdit(!edit)}>{edit ? t.finish : t.edit}</button>
      </div>
      <span className="eyebrow mt8">{fmtDay(w.startedAt, t)} · {fmtTime(w.startedAt)}–{fmtTime(w.finishedAt ?? w.startedAt)}</span>
      <h1 className="h1">{w.planName || t.freeShort}</h1>

      <div className="kpis mt16">
        <div><b>{sum.minutes}</b><span>{t.minutes}</span></div>
        <div><b>{sum.sets}</b><span>{t.sets}</span></div>
        <div><b>{vol}</b><span>{t.volume}</span></div>
      </div>

      {extras.length > 0 && (
        <div className="chips mt12">
          {extras.map((e) => <span key={e.id} className="chip hot" style={{ minHeight: 32, fontSize: 14 }}>✓ {t.extrasL[e.kind]}</span>)}
        </div>
      )}

      <div className="stack mt16">
        {st.map((station) => {
          const sup = station.length > 1;
          return (
            <section key={station[0].id} className={sup ? 'sgroup' : ''} style={sup ? { margin: '8px -10px', padding: '4px 10px 8px' } : { borderTop: '1px solid var(--line)', padding: '10px 0' }}>
              {sup && <span className="eyebrow accent" style={{ fontSize: 13 }}>{t.superset}</span>}
              {station.map((we, k) => {
                const ex = d.ex.get(we.exerciseId);
                if (!ex) return null;
                const all = setsOf(d, we.id);
                const shown = edit ? all : all.filter((s) => s.done);
                const ctx = contextOfWe(d, we);
                const bw = ex.loadType === 'bodyweightPlus';
                return (
                  <div key={we.id} className="stack" style={{ gap: 4, padding: sup ? '8px 0 0' : 0 }}>
                    <div className="between">
                      <span className="row" style={{ gap: 10, minWidth: 0 }}>
                        {sup && <span className="letter" style={{ width: 26, height: 26, fontSize: 15 }}>{LETTERS[k]}</span>}
                        <span className="cond" style={{ fontSize: 24, fontWeight: 800, textTransform: 'uppercase', lineHeight: 1 }}>{exName(ex, lang)}</span>
                      </span>
                      {prIds.has(ex.id + ctx) && <span className="tag">PR</span>}
                    </div>
                    {we.skipped === 1 && <span className="small muted">{t.skipped}</span>}
                    {ex.loadType !== 'weight' && <span className="small muted">{ex.loadType === 'perHand' ? t.hintPerHand : t.hintBw}</span>}
                    {shown.map((s, i) => edit ? (
                      <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 44px 44px', gap: 6, alignItems: 'center' }}>
                        <span className="cond muted" style={{ fontWeight: 700 }}>{i + 1}</span>
                        <NumField id={`hw-${s.id}`} label={`${t.set} ${i + 1} ${t.kg}`} decimal display={num(s.weightKg, lang)} onValue={(v) => updateSet(s.id, { weightKg: v })} />
                        <NumField id={`hr-${s.id}`} label={`${t.set} ${i + 1} ${t.reps}`} display={String(s.reps)} onValue={(v) => updateSet(s.id, { reps: Math.round(v) })} />
                        <button className={`roundbtn${s.done ? ' on' : ''}`} aria-pressed={!!s.done} aria-label={`${t.set} ${i + 1} ✓`} onClick={() => toggleSet(s)}>✓</button>
                        <button className="roundbtn" aria-label={t.removeSet} onClick={() => removeSet(s.id)}>×</button>
                      </div>
                    ) : (
                      <div key={s.id} className="row" style={{ gap: 12, minHeight: 30 }}>
                        <span className="cond muted" style={{ width: 20, fontWeight: 700 }}>{i + 1}</span>
                        <span className="cond" style={{ fontSize: 24, fontWeight: 800 }}>
                          {bw ? '+' : ''}{num(s.weightKg, lang)}<small style={{ fontSize: 14, color: 'var(--dim)' }}> {bw ? t.addedKg : t.kg} × </small>{s.reps}
                        </span>
                      </div>
                    ))}
                    {!shown.length && !we.skipped && <span className="small muted">—</span>}
                    {we.note && <span className="small muted" style={{ fontStyle: 'italic' }}>„{we.note}“</span>}
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>

      {(w.note || edit) && (
        <div className="stack gap8 mt16">
          <span className="eyebrow">{t.workoutNote}</span>
          {edit
            ? <textarea id={`wn-${w.id}`} className="note" defaultValue={w.note} aria-label={t.workoutNote} onBlur={(e) => setWorkoutNote(w.id, e.target.value.trim())} />
            : <p className="small" style={{ margin: 0 }}>{w.note}</p>}
        </div>
      )}

      {edit && (
        <div className="stack gap8 mt24">
          <span className="muted small">{t.editHint}</span>
          <button className="btn" onClick={del}>{t.deleteWorkout}</button>
        </div>
      )}
    </main>
  );
}
