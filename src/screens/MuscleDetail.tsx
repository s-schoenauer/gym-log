import { useState } from 'react';
import type { Data } from '../repo';
import type { Muscle } from '../db';
import { subMuscleSets, periodDays, PERIODS, type Period } from '../calc';
import { SUB_MUSCLES, GROUP_OF, SUB_LABELS, SUB_HINT, METHOD_SOURCES, type SubMuscle } from '../muscles';
import { useT, exName, num } from '../i18n';
import { Sheet, Icon } from '../ui';

const GROUPS: Muscle[] = ['chest', 'shoulders', 'back', 'arms', 'legs', 'core'];
const KEY = 'gymlog.musclePeriod';
const KEY_W = 'gymlog.muscleWeighted';

const loadPeriod = (): Period => {
  try { const v = localStorage.getItem(KEY) as Period | null; return v && PERIODS.includes(v) ? v : 'week'; } catch { return 'week'; }
};

/** Sets per sub-muscle, split into direct (counts 1) and indirect (counts 0.5) work. */
export function MuscleDetail({ d }: { d: Data }) {
  const { t, lang } = useT();
  const [period, setPeriod] = useState<Period>(loadPeriod);
  const [open, setOpen] = useState<SubMuscle | null>(null);
  const [weighted, setWeighted] = useState<boolean>(() => { try { return localStorage.getItem(KEY_W) !== '0'; } catch { return true; } });
  const setW = (v: boolean) => { setWeighted(v); try { localStorage.setItem(KEY_W, v ? '1' : '0'); } catch { /* storage blocked */ } };
  const stats = subMuscleSets(d, period);
  const split = (m: SubMuscle) => {
    let direct = 0, indirect = 0;
    for (const p of stats[m].parts) (p.weight >= 1 ? (direct += p.sets) : (indirect += weighted ? p.sets * p.weight : p.sets));
    return { direct, indirect, total: direct + indirect };
  };
  const max = Math.max(1, ...SUB_MUSCLES.map((m) => split(m).total));
  const fmt = (v: number) => num(Math.round(v * 10) / 10, lang);

  const pick = (p: Period) => { setPeriod(p); try { localStorage.setItem(KEY, p); } catch { /* storage blocked */ } };

  return (
    <section className="stack gap8 mt24" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
      <span className="eyebrow">{t.muscleDetail}</span>
      <div className="seg seg4" role="group" aria-label={t.muscleDetail}>
        {PERIODS.map((p) => <button key={p} className={period === p ? 'on' : ''} aria-pressed={period === p} onClick={() => pick(p)}>{t.periods[p]}</button>)}
      </div>
      <div className="between">
        <div className="legend">
          <span><i style={{ background: 'var(--text)' }} />{t.direct}</span>
          <span><i style={{ background: '#6b6b6b' }} />{t.indirect}{weighted ? ' (½)' : ''}</span>
        </div>
        <div className="seg" style={{ padding: 2, borderWidth: 1 }} role="group" aria-label={t.countingNote}>
          <button className={weighted ? 'on' : ''} style={{ minHeight: 32, fontSize: 13, padding: '0 10px' }} aria-pressed={weighted} onClick={() => setW(true)}>½</button>
          <button className={!weighted ? 'on' : ''} style={{ minHeight: 32, fontSize: 13, padding: '0 10px' }} aria-pressed={!weighted} onClick={() => setW(false)}>1</button>
        </div>
      </div>

      {GROUPS.map((g) => (
        <div key={g} className="stack mt8" style={{ gap: 2 }}>
          <span className="cond" style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)' }}>{t.muscles[g]}</span>
          {SUB_MUSCLES.filter((m) => GROUP_OF[m] === g).map((m) => {
            const s = split(m);
            return (
              <button key={m} className="mrow" onClick={() => setOpen(m)} aria-label={`${SUB_LABELS[lang][m]}: ${fmt(s.total)}`}>
                <span className="mname">{SUB_LABELS[lang][m]}</span>
                <span className="bar stackbar">
                  <span style={{ width: `${(s.direct / max) * 100}%`, background: 'var(--text)' }} />
                  <span style={{ width: `${(s.indirect / max) * 100}%`, background: '#6b6b6b' }} />
                </span>
                <span className="cond mval" style={{ color: s.total ? 'var(--text)' : 'var(--off)' }}>{fmt(s.total)}</span>
              </button>
            );
          })}
        </div>
      ))}

      <p className="muted small" style={{ margin: '8px 0 0' }}>
        {weighted ? t.countingNote : t.countingFull} <a href={METHOD_SOURCES.counting.url} target="_blank" rel="noreferrer">{t.countingSource}</a>
      </p>

      {open && (
        <Sheet onClose={() => setOpen(null)} label={SUB_LABELS[lang][open]}>
          <div className="between">
            <span className="eyebrow">{t.periods[period]}</span>
            <button className="icon-btn" style={{ width: 44, height: 44 }} aria-label={t.cancel} onClick={() => setOpen(null)}>{Icon.close()}</button>
          </div>
          <h2 className="h1" style={{ fontSize: 40, margin: 0 }}>{SUB_LABELS[lang][open]}</h2>
          {SUB_HINT[lang][open] && <span className="muted small">{SUB_HINT[lang][open]}</span>}
          <div className="kpis">
            <div><b>{fmt(split(open).direct)}</b><span>{t.direct}</span></div>
            <div><b>{fmt(split(open).indirect)}</b><span>{t.indirect}{weighted ? ' (½)' : ''}</span></div>
            {period === 'month' || period === '30d'
              ? <div><b>{fmt((split(open).total / periodDays(period)) * 7)}</b><span>Ø {t.perWeek}</span></div>
              : <div><b>{fmt(split(open).total)}</b><span>{t.sets}</span></div>}
          </div>
          <span className="eyebrow">{t.whereFrom}</span>
          <div className="list">
            {stats[open].parts.map((p) => (
              <div key={p.exercise.id} className="between" style={{ minHeight: 52 }}>
                <span className="stack" style={{ minWidth: 0 }}>
                  <span className="cond" style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase' }}>{exName(p.exercise, lang)}</span>
                  <span className="small muted">{p.sets} {t.sets} · {p.weight >= 1 ? t.direct : weighted ? `${t.indirect} × ½` : t.indirect}</span>
                </span>
                <span className="cond" style={{ fontSize: 22, fontWeight: 800, color: p.weight >= 1 ? 'var(--text)' : '#9a9a9a' }}>{fmt(weighted ? p.sets * p.weight : p.sets)}</span>
              </div>
            ))}
            {!stats[open].parts.length && <div className="empty">{t.noSetsMuscle}</div>}
          </div>
        </Sheet>
      )}
    </section>
  );
}
