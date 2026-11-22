import type { Data } from '../repo';
import { setWorkoutNote } from '../repo';
import { workoutSummary, compareSets } from '../calc';
import { useT, exName, num, setText, shortDate, ctxLabel } from '../i18n';
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
    if (!r.lastSets) return { text: t.newEntry.toUpperCase(), col: 'var(--muted)', detail: '' };
    const c = compareSets(r.sets, r.lastSets);
    const R = t.reps.toUpperCase();
    const parts: string[] = [];
    if (c.kgUp) parts.push(`+${num(c.kgUp, lang)} KG`);
    if (c.kgDown) parts.push(`−${num(c.kgDown, lang)} KG`);
    if (c.repsUp) parts.push(`+${c.repsUp} ${R}`);
    if (c.repsDown) parts.push(`−${c.repsDown} ${R}`);
    if (c.setsDiff) parts.push(`${c.setsDiff > 0 ? '+' : '−'}${Math.abs(c.setsDiff)} ${(Math.abs(c.setsDiff) === 1 ? t.set : t.setsShort).toUpperCase()}`);
    const better = c.kgUp || c.repsUp || c.setsDiff > 0, worse = c.kgDown || c.repsDown || c.setsDiff < 0;
    // per set: current value, with the change in brackets where something changed
    const detail = c.perSet.some((p) => !p || p.dKg || p.dReps) ? r.sets.map((x, i) => {
      const p = c.perSet[i];
      const d = !p ? ` (${t.newEntry.toLowerCase()})` : p.dKg ? ` (${p.dKg > 0 ? '+' : '−'}${num(Math.abs(p.dKg), lang)} kg)` : p.dReps ? ` (${p.dReps > 0 ? '+' : '−'}${Math.abs(p.dReps)})` : '';
      return setText(x, r.exercise.loadType, lang) + d;
    }).join(' · ') : '';
    if (!parts.length) return { text: t.same.toUpperCase(), col: 'var(--muted)', detail };
    return { text: parts.join(' · '), col: better && !worse ? 'var(--accent)' : better ? 'var(--text)' : '#d4d4d4', detail };
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
        <div key={r.exercise.id + r.ctx} className="prcard mt16">
          <div className="h">{t.newRecord}</div>
          <div className="v">{exName(r.exercise, lang)} {setText(r.best, r.exercise.loadType, lang).replace('×', ' × ')}</div>
          {r.ctx && <div className="small" style={{ fontWeight: 600 }}>{ctxLabel(r.ctx, d.ex, lang)}</div>}
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
                <div key={r.exercise.id + r.ctx} className="stack" style={{ minHeight: 48, justifyContent: 'center', padding: '6px 0', gap: 2 }}>
                  <div className="between">
                    <span className="cond" style={{ fontSize: 22, fontWeight: 700, textTransform: 'uppercase' }}>{exName(r.exercise, lang)}</span>
                    <span className="cond" style={{ fontSize: 20, fontWeight: 700, color: df.col, flex: 'none', textAlign: 'right' }}>{df.text}</span>
                  </div>
                  {df.detail && <span className="small muted">{df.detail}</span>}
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
