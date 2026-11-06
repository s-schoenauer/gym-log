import type { Data } from '../repo';
import { setWorkoutNote } from '../repo';
import { workoutSummary, beats } from '../calc';
import { useT, exName, num, setText, shortDate } from '../i18n';
import { useState } from 'react';

export function Finish({ d, workoutId }: { d: Data; workoutId: string }) {
  const { t, lang } = useT();
  const [noteOpen, setNoteOpen] = useState(false);
  const w = d.workouts.find((x) => x.id === workoutId);
  if (!w) return <main className="screen"><a className="btn primary block" href="#/">{t.today}</a></main>;
  const s = workoutSummary(d, workoutId);
  const prs = s.results.filter((r) => r.isPr);
  const vol = s.volume >= 1000 ? `${num(Math.round(s.volume / 100) / 10, lang)}` : num(Math.round(s.volume), lang);
  const volUnit = s.volume >= 1000 ? 'T' : 'KG';

  const diff = (r: (typeof s.results)[number]) => {
    if (!r.last) return { text: t.newEntry.toUpperCase(), col: 'var(--muted)' };
    const a = r.best, b = r.last;
    if (a.weightKg !== b.weightKg) {
      const dlt = Math.round((a.weightKg - b.weightKg) * 100) / 100;
      return { text: `${dlt > 0 ? '+' : '−'}${num(Math.abs(dlt), lang)} KG`, col: dlt > 0 ? 'var(--accent)' : '#d4d4d4' };
    }
    if (a.reps !== b.reps) {
      const dlt = a.reps - b.reps;
      return { text: `${dlt > 0 ? '+' : '−'}${Math.abs(dlt)} ${t.reps.toUpperCase()}`, col: beats(a, b) ? 'var(--accent)' : '#d4d4d4' };
    }
    return { text: t.same.toUpperCase(), col: 'var(--muted)' };
  };

  return (
    <main className="screen no-nav">
      <span className="eyebrow">{w.planName || t.freeShort} · {shortDate(w.startedAt, lang)}</span>
      <h1 className="h1" style={{ fontSize: 80, lineHeight: 0.88, marginTop: 8 }}>{t.done}</h1>

      <div className="kpis mt16">
        <div><b>{s.minutes}</b><span>{t.minutes}</span></div>
        <div><b>{s.sets}</b><span>{t.sets}</span></div>
        <div><b>{vol}<small style={{ fontSize: 20 }}>{volUnit}</small></b><span>{t.volume}</span></div>
      </div>

      {prs.map((r) => (
        <div key={r.exercise.id} className="prcard mt16">
          <div className="h">{t.newRecord}</div>
          <div className="v">{exName(r.exercise, lang)} {setText(r.best, r.exercise.loadType, lang).replace('×', ' × ')}</div>
          {r.prevBest && <div className="small" style={{ fontWeight: 600 }}>{t.before} {setText(r.prevBest, r.exercise.loadType, lang)}{r.exercise.loadType === 'perHand' ? ` · ${t.perHand.toLowerCase()}` : ''}</div>}
        </div>
      ))}

      {s.results.length > 0 && (
        <>
          <span className="eyebrow mt24">{t.vsLast}</span>
          <div className="list mt8">
            {s.results.map((r) => {
              const df = diff(r);
              return (
                <div key={r.exercise.id} className="between" style={{ minHeight: 48 }}>
                  <span className="cond" style={{ fontSize: 22, fontWeight: 700, textTransform: 'uppercase' }}>{exName(r.exercise, lang)}</span>
                  <span className="cond" style={{ fontSize: 20, fontWeight: 700, color: df.col, flex: 'none' }}>{df.text}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="stack gap8" style={{ marginTop: 'auto', paddingTop: 24 }}>
        {noteOpen && <textarea className="note" autoFocus defaultValue={w.note} aria-label={t.workoutNote} placeholder={t.workoutNote} onBlur={(e) => setWorkoutNote(w.id, e.target.value.trim())} />}
        <a className="btn primary block" href="#/">{t.save}</a>
        {!noteOpen && <button className="link-btn" style={{ alignSelf: 'center', fontSize: 14, letterSpacing: 1 }} onClick={() => setNoteOpen(true)}>+ {t.workoutNote}</button>}
      </div>
    </main>
  );
}
