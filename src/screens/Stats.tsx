import type { Data } from '../repo';
import { heatmap, exerciseHistory, bestSet } from '../calc';
import { MuscleDetail } from './MuscleDetail';
import { useT, exName, num, shortDate } from '../i18n';
import { go } from '../App';


export function Stats({ d, q }: { d: Data; q: URLSearchParams }) {
  const { t, lang } = useT();
  const hm = heatmap(d, 12);

  // exercises that have history, most logged first
  const withHist = d.exercises
    .map((e) => ({ e, h: exerciseHistory(d, e.id) }))
    .filter((x) => x.h.length > 0)
    .sort((a, b) => b.h.length - a.h.length);
  const sel = withHist.find((x) => x.e.id === q.get('ex')) ?? withHist[0];


  return (
    <main className="screen">
      <h1 className="h1" style={{ fontSize: 64 }}>{t.stats}</h1>

      <section className="stack gap8 mt16" aria-label={t.weeks12}>
        <div className="between">
          <span className="eyebrow">{t.weeks12}</span>
          <span className="cond" style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase' }}>{t.trainings(hm.trainings)}</span>
        </div>
        <div className="heat" role="img" aria-label={t.trainings(hm.trainings)}>
          {hm.days.map((x) => <span key={x.key} className={x.future ? 'future' : x.kind} title={x.key} />)}
        </div>
        <div className="legend">
          <span><i style={{ background: '#fff' }} />{t.training}</span>
          <span><i style={{ background: 'var(--accent)' }} />{t.withPr}</span>
          <span><i style={{ background: '#525252' }} />{t.onlyExtras}</span>
        </div>
      </section>

      <section className="stack gap8 mt24" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        {sel ? <ExerciseChart d={d} sel={sel} options={withHist.map((x) => x.e)} /> : (
          <>
            <span className="eyebrow">{t.bestSet}</span>
            <p className="muted" style={{ margin: 0 }}>{t.noData}</p>
          </>
        )}
      </section>

      <MuscleDetail d={d} />
    </main>
  );

  function ExerciseChart({ d: _d, sel, options }: { d: Data; sel: { e: (typeof withHist)[number]['e']; h: ReturnType<typeof exerciseHistory> }; options: (typeof withHist)[number]['e'][] }) {
    void _d;
    const { e, h } = sel;
    const bw = e.loadType === 'bodyweightPlus';
    const best = bestSet(h.map((x) => x.set))!;
    // bodyweight with no added weight: chart reps instead
    const useReps = bw && h.every((x) => x.set.weightKg === 0);
    const vals = h.map((x) => (useReps ? x.set.reps : x.set.weightKg));
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const W = 350, H = 110, pad = 8;
    const X = (i: number) => (h.length === 1 ? W / 2 : pad + (i / (h.length - 1)) * (W - 2 * pad));
    const Y = (v: number) => (hi === lo ? H / 2 : H - pad - ((v - lo) / (hi - lo)) * (H - 2 * pad));
    const pts = vals.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
    const unit = useReps ? t.reps.toUpperCase() : e.loadType === 'perHand' ? t.perHand : bw ? t.addedKg : t.kg;

    return (
      <>
        <div className="between">
          <label className="field" style={{ borderBottom: 0, minHeight: 44, flex: 1 }}>
            <select value={e.id} onChange={(ev) => go(`#/stats?ex=${ev.target.value}`)} aria-label={t.exercises} style={{ fontSize: 24, fontWeight: 800, textTransform: 'uppercase' }}>
              {options.map((o) => <option key={o.id} value={o.id}>{exName(o, lang)}</option>)}
            </select>
          </label>
          <span className="eyebrow">{t.bestSet}</span>
        </div>
        <span className="cond accent" style={{ fontSize: 56, fontWeight: 800, lineHeight: 0.9 }}>
          {useReps ? best.reps : `${bw ? '+' : ''}${num(best.weightKg, lang)}`}
          <span style={{ fontSize: 22, color: 'var(--text)' }}> {useReps ? t.reps.toUpperCase() : `${unit} × ${best.reps}`}</span>
        </span>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${exName(e, lang)}: ${num(lo, lang)} → ${num(vals[vals.length - 1], lang)} ${unit}`}>
          <line x1="0" y1={H - 1} x2={W} y2={H - 1} stroke="#262626" />
          {h.length > 1 && <polyline points={pts} fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
          <circle cx={X(h.length - 1)} cy={Y(vals[vals.length - 1])} r="6" fill="var(--accent)" />
        </svg>
        <div className="between cond" style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, color: 'var(--dim)', textTransform: 'uppercase' }}>
          <span>{shortDate(h[0].ts, lang)}</span>
          <span>{num(lo, lang)}–{num(hi, lang)} {unit}</span>
          <span>{shortDate(h[h.length - 1].ts, lang)}</span>
        </div>
      </>
    );
  }
}
