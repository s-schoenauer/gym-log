import { useState } from 'react';
import type { ExtraKind } from '../db';
import { type Data, activeWorkout, planItemsOf, startWorkout, toggleExtra, todayKey } from '../repo';
import { heatmap } from '../calc';
import { useT, shortDate } from '../i18n';
import { go } from '../App';
import { Icon } from '../ui';

const EXTRAS: ExtraKind[] = ['stretch', 'cardio', 'run', 'football'];

export function Today({ d }: { d: Data }) {
  const { t, lang } = useT();
  const running = activeWorkout(d);
  const plans = d.plans.filter((p) => p.status === 'active');

  // last finished workout per plan
  const lastByPlan = new Map<string, number>();
  for (const w of d.workouts) if (w.finishedAt && w.planId) lastByPlan.set(w.planId, Math.max(lastByPlan.get(w.planId) ?? 0, w.startedAt));

  // preselect the plan done longest ago (pure convenience, still your choice)
  const defaultPick = [...plans].sort((a, b) => (lastByPlan.get(a.id) ?? 0) - (lastByPlan.get(b.id) ?? 0))[0]?.id ?? 'free';
  const [pick, setPick] = useState<string>(defaultPick);

  const now = new Date();
  const week = heatmap(d, 1).days;
  const tk = todayKey();
  const todaysExtras = new Set(d.extraLogs.filter((e) => e.date === tk).map((e) => e.kind));

  const ago = (ts?: number) => {
    if (!ts) return '';
    const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(ts).setHours(0, 0, 0, 0)) / 864e5);
    if (days < 7) return t.lastOn(t.weekdays[new Date(ts).getDay()].slice(0, 2));
    return t.lastOn(shortDate(ts, lang));
  };

  const start = async () => {
    if (running) return go('#/workout');
    await startWorkout(d, pick === 'free' ? null : pick);
    go('#/workout');
  };

  const pickedName = pick === 'free' ? t.free : plans.find((p) => p.id === pick)?.name ?? '';

  return (
    <main className="screen">
      <div className="between">
        <span className="eyebrow">{t.weekdays[now.getDay()]} · {String(now.getDate()).padStart(2, '0')}.{String(now.getMonth() + 1).padStart(2, '0')}</span>
        <a href="#/settings" className="icon-btn" aria-label={t.settings} style={{ width: 44, height: 44 }}>{Icon.gear()}</a>
      </div>
      <h1 className="h1" style={{ fontSize: 64 }}>{t.today}</h1>

      <div className="week mt16">
        {week.map((day, i) => (
          <div key={day.key}>
            <span className={`wd${day.key === tk ? ' now' : ''}`}>{t.dayShort[i]}</span>
            <span className={`ring ${day.kind}${day.key === tk && day.kind === 'none' ? ' now' : ''}`} />
          </div>
        ))}
      </div>

      {running ? (
        <div className="stack gap12 mt24">
          <span className="eyebrow">{t.running}</span>
          <button className="btn primary block" onClick={() => go('#/workout')}>{t.continueWorkout} · {running.planName || t.freeShort} →</button>
        </div>
      ) : (
        <>
          <span className="eyebrow mt24">{t.whatsUp}</span>
          <div className="stack">
            {plans.map((p) => (
              <button key={p.id} className={`split${pick === p.id ? ' on' : ''}`} style={{ borderBottom: '1px solid var(--line)' }} onClick={() => setPick(p.id)} aria-pressed={pick === p.id}>
                <span className="name">{p.name}</span>
                <span className="meta">{t.exercisesN(planItemsOf(d, p.id).length)}{lastByPlan.has(p.id) ? ` · ${ago(lastByPlan.get(p.id))}` : ''}</span>
              </button>
            ))}
            <button className={`split${pick === 'free' ? ' on' : ''}`} style={{ borderBottom: '1px solid var(--line)' }} onClick={() => setPick('free')} aria-pressed={pick === 'free'}>
              <span className="name">{t.freeShort}</span>
              <span className="meta">{t.emptyStart}</span>
            </button>
          </div>
          <button className="btn primary block mt16" onClick={start}>{pickedName} {t.start} →</button>
        </>
      )}

      <span className="eyebrow mt24">{t.extras}</span>
      <div className="chips mt8">
        {EXTRAS.map((k) => {
          const on = todaysExtras.has(k);
          return (
            <button key={k} className={`chip${on ? ' hot' : ''}`} style={{ minHeight: 44, fontSize: 18, padding: '0 16px' }} aria-pressed={on} onClick={() => toggleExtra(d, k)}>
              {on ? '✓ ' : ''}{t.extrasL[k]}
            </button>
          );
        })}
      </div>
    </main>
  );
}
