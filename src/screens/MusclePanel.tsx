import { useState } from 'react';
import type { Exercise } from '../db';
import { updateExercise } from '../repo';
import { effectiveTargets, variantOf } from '../calc';
import { EVIDENCE, SOURCES } from '../evidence';
import { SUB_MUSCLES, SUB_LABELS, GROUP_OF, type SubMuscle, type Targets } from '../muscles';
import { useT } from '../i18n';

const mark = (w?: number) => (w === 1 ? '1' : w === 0.5 ? '½' : '');

/** Which muscles an exercise trains, why (studies), and the user's own adjustments. */
export function MusclePanel({ ex }: { ex: Exercise }) {
  const { t, lang } = useT();
  const [editing, setEditing] = useState(false);
  const ev = ex.key ? EVIDENCE[ex.key] : undefined;
  const v = variantOf(ex);
  const targets = effectiveTargets(ex);
  const own = !!ex.targets && Object.keys(ex.targets).length > 0;
  const listed = (Object.entries(targets) as [SubMuscle, number][]).filter(([, w]) => w).sort((a, b) => b[1] - a[1]);

  const cycle = (m: SubMuscle) => {
    const next: Targets = { ...targets };
    const cur = next[m] ?? 0;
    const val = cur === 0 ? 0.5 : cur === 0.5 ? 1 : 0;
    if (val) next[m] = val; else delete next[m];
    updateExercise(ex.id, { targets: next });
  };

  return (
    <div className="stack gap8">
      <span className="eyebrow">{t.musclesTitle}</span>

      {ev && ev.variants.length > 1 && (
        <>
          <span className="small muted">{t.execution}</span>
          <div className="chips">
            {ev.variants.map((x) => (
              <button key={x.key} className={`chip${v?.key === x.key ? ' on' : ''}`} style={{ textTransform: 'none', letterSpacing: 0, fontSize: 15 }}
                aria-pressed={v?.key === x.key} onClick={() => updateExercise(ex.id, { variant: x.key })}>
                {lang === 'en' ? x.labelEn : x.labelDe}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="chips">
        {listed.map(([m, w]) => (
          <span key={m} className={`chip${w === 1 ? ' on' : ''}`} style={{ textTransform: 'none', letterSpacing: 0, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {SUB_LABELS[lang][m]} <b className="cond">{mark(w)}</b>
          </span>
        ))}
      </div>

      {own ? <span className="small accent">{t.ownMapping}</span> : v ? (
        <>
          <p className="small" style={{ margin: 0, lineHeight: 1.45 }}>{v.summaryDe}</p>
          <span className="small muted">{t.basis[v.basis]}</span>
        </>
      ) : <span className="small muted">{t.noEvidence}</span>}

      <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
        <button className="link-btn" style={{ fontSize: 14 }} aria-expanded={editing} onClick={() => setEditing(!editing)}>{editing ? '✓ ' : '✎ '}{t.ownMapping}</button>
        {own && <button className="link-btn" style={{ fontSize: 14 }} onClick={() => updateExercise(ex.id, { targets: null })}>{t.resetMapping}</button>}
      </div>

      {editing && (
        <div className="stack gap8">
          <span className="small muted">{t.cycleHint}</span>
          {(['chest', 'shoulders', 'back', 'arms', 'legs', 'core'] as const).map((g) => (
            <div key={g} className="chips">
              {SUB_MUSCLES.filter((m) => GROUP_OF[m] === g).map((m) => {
                const w = targets[m];
                return (
                  <button key={m} className={`chip${w === 1 ? ' on' : w ? ' half' : ''}`} style={{ textTransform: 'none', letterSpacing: 0, fontSize: 14 }}
                    onClick={() => cycle(m)} aria-label={`${SUB_LABELS[lang][m]} ${mark(w) || '0'}`}>
                    {SUB_LABELS[lang][m]}{w ? ` · ${mark(w)}` : ''}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {!own && ev && ev.myths.length > 0 && (
        <details className="mt8">
          <summary className="eyebrow" style={{ cursor: 'pointer' }}>{t.mythCheck}</summary>
          <ul className="small" style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.45 }}>{ev.myths.map((m) => <li key={m}>{m}</li>)}</ul>
        </details>
      )}

      {!own && v && v.sourceIds.length > 0 && (
        <details>
          <summary className="eyebrow" style={{ cursor: 'pointer' }}>{t.sources} ({v.sourceIds.length})</summary>
          <ol className="small" style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.45, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {v.sourceIds.map((id) => SOURCES[id]).filter(Boolean).map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" style={{ color: 'var(--text)' }}>{s.cite}</a>
                <div className="muted">{s.type} · {s.finding}</div>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
