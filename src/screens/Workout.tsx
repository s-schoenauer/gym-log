import { useEffect, useState } from 'react';
import type { WorkoutExercise, WorkoutSet, Exercise } from '../db';
import {
  type Data, activeWorkout, exercisesOf, setsOf, lastPerformance, updateSet, toggleSet, addSet, addRound, removeSet,
  setExerciseNote, setSkipped, moveToEnd, swapExercise, finishWorkout, discardWorkout, addExerciseToWorkout, stations, toggleLink
} from '../repo';
import { useT, exName, num, setText, shortDate } from '../i18n';
import { go } from '../App';
import { Icon, Sheet, ask } from '../ui';

function Clock({ since }: { since: number }) {
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(i); }, []);
  const s = Math.floor((Date.now() - since) / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return <>{h ? `${h}:` : ''}{String(m).padStart(h ? 2 : 1, '0')}:{String(sec).padStart(2, '0')}</>;
}

const parseNum = (v: string) => { const n = parseFloat(v.replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : null; };
const LETTERS = 'ABCDEFGH';

/** Sets of a station in the order they are done: round by round, A then B. */
function flowOf(d: Data, station: WorkoutExercise[]) {
  const members = station.filter((we) => !we.skipped || station.length === 1);
  const per = members.map((we) => setsOf(d, we.id));
  const rounds = Math.max(0, ...per.map((s) => s.length));
  const flow: { we: WorkoutExercise; set: WorkoutSet; letter: string; round: number }[] = [];
  for (let r = 0; r < rounds; r++) {
    members.forEach((we, k) => { const s = per[k][r]; if (s) flow.push({ we, set: s, letter: LETTERS[station.indexOf(we)] ?? '?', round: r }); });
  }
  return flow;
}

export function WorkoutScreen({ d }: { d: Data }) {
  const { t, lang } = useT();
  const w = activeWorkout(d);
  const wes = w ? exercisesOf(d, w.id) : [];
  const st = stations(wes);
  const [curKey, setCurKey] = useState<string | null>(null);
  const [activeSet, setActiveSet] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [noteOpen, setNoteOpen] = useState(false);
  const [swapFor, setSwapFor] = useState<string | null>(null);

  const fallback = st.find((s) => flowOf(d, s).some((f) => !f.set.done)) ?? st[0];
  const cur = st.find((s) => s.some((we) => we.id === curKey)) ?? fallback;
  const flow = cur ? flowOf(d, cur) : [];
  const active = flow.find((f) => f.set.id === activeSet)?.set ?? (activeSet === 'none' ? undefined : flow.find((f) => !f.set.done)?.set);

  useEffect(() => { setNoteOpen(false); }, [cur?.[0]?.id]);
  // stay on the chosen station until the user moves on (no auto-jump after the last set)
  useEffect(() => { if (!curKey && fallback) setCurKey(fallback[0].id); }, [curKey, fallback]);

  if (!w) {
    return (
      <main className="screen">
        <h1 className="h1">{t.log}</h1>
        <p className="muted">—</p>
        <a className="btn primary block mt16" href="#/">{t.today} →</a>
      </main>
    );
  }

  const select = (weId: string) => { setCurKey(weId); setActiveSet(null); };
  const idx = cur ? st.indexOf(cur) : -1;
  const next = st.slice(idx + 1).find((s) => s.some((we) => !we.skipped)) ?? null;
  const curDone = flow.length > 0 && flow.every((f) => f.set.done);
  const stationName = (s: WorkoutExercise[]) => s.filter((we) => !we.skipped || s.length === 1).map((we) => exName(d.ex.get(we.exerciseId), lang)).join(' + ');

  const finish = async () => {
    const anyDone = d.sets.some((s) => s.done && wes.some((we) => we.id === s.workoutExerciseId));
    if (!anyDone) {
      if (await ask.confirm(t.confirmDiscard)) { await discardWorkout(d, w.id); go('#/'); }
      return;
    }
    await finishWorkout(w.id);
    go(`#/finish/${w.id}`);
  };

  const toggle = async (s: WorkoutSet) => {
    await toggleSet(s);
    if (s.done) return setActiveSet(s.id);
    const i = flow.findIndex((f) => f.set.id === s.id);
    const after = [...flow.slice(i + 1), ...flow.slice(0, i)].find((f) => !f.set.done);
    setActiveSet(after?.set.id ?? 'none');
  };

  const swapWe = wes.find((we) => we.id === swapFor);
  const swapEx = swapWe ? d.ex.get(swapWe.exerciseId) : undefined;

  return (
    <main className="screen no-nav">
      <div className="between">
        <a className="link-btn" href="#/">← {w.planName || t.freeShort} · <Clock since={w.startedAt} /></a>
        <button className="btn sm" onClick={finish}>{t.finish}</button>
      </div>

      {st.length > 0 && (
        <div className="segs mt8" style={{ gridTemplateColumns: `repeat(${st.length}, 1fr)` }}>
          {st.map((s) => {
            const f = flowOf(d, s);
            const cls = s === cur ? 'cur' : s.every((we) => we.skipped) ? 'skip' : f.length && f.every((x) => x.set.done) ? 'done' : '';
            return <button key={s[0].id} aria-label={stationName(s)} onClick={() => select(s[0].id)}><span className={cls} /></button>;
          })}
        </div>
      )}

      {cur ? (
        <StationView key={cur[0].id} d={d} station={cur} flow={flow} active={active} nonce={nonce}
          onActive={(id) => setActiveSet(id)} onToggle={toggle} onBump={() => setNonce((n) => n + 1)}
          noteOpen={noteOpen} onNote={() => setNoteOpen((x) => !x)} onSwap={(id) => setSwapFor(id)} />
      ) : (
        <div className="stack gap12 mt16">
          <h1 className="h1">{t.free}</h1>
          <p className="muted small" style={{ margin: 0 }}>{t.freeHint}</p>
        </div>
      )}

      <div className="stack gap8 mt16">
        <a className="btn dashed block" href="#/library?pick=workout">{t.addFromLib}</a>
        {!w.planId && <RecentChips d={d} workoutId={w.id} onAdded={select} />}
      </div>

      <div className="stack gap12" style={{ marginTop: 'auto', paddingTop: 24 }}>
        {cur && (next ? (
          <button className={`btn primary block${curDone ? ' hot' : ''}`} onClick={() => select(next[0].id)}>
            {t.next}: {stationName(next)} →
          </button>
        ) : (
          <button className={`btn primary block${curDone ? ' hot' : ''}`} onClick={finish}>{t.lastExercise}</button>
        ))}
        <button className="link-btn" style={{ alignSelf: 'center', fontSize: 14 }} onClick={async () => { if (await ask.confirm(t.confirmDiscard)) { await discardWorkout(d, w.id); go('#/'); } }}>{t.discard}</button>
      </div>

      {swapWe && swapEx && (
        <SwapSheet d={d} we={swapWe} ex={swapEx} list={wes} planId={w.planId} onClose={() => setSwapFor(null)}
          onSkipped={() => { setSwapFor(null); if (cur && cur.length === 1 && next) select(next[0].id); }} />
      )}
    </main>
  );
}

/** Last time, notes and load hints for one exercise. */
function ExerciseInfo({ d, we, ex }: { d: Data; we: WorkoutExercise; ex: Exercise }) {
  const { t, lang } = useT();
  const last = lastPerformance(d, ex.id, we.workoutId);
  const bw = ex.loadType === 'bodyweightPlus';
  const hint = [ex.loadType === 'perHand' ? t.hintPerHand : bw ? t.hintBw : '', ex.gymNote].filter(Boolean).join(' · ');
  return (
    <div className="stack" style={{ gap: 2 }}>
      {last ? (
        <span className="muted" style={{ fontSize: 14 }}>
          {t.lastTime} ({shortDate(last.workout.startedAt, lang)}): <b style={{ color: 'var(--text)', fontWeight: 600 }}>{last.sets.map((s) => setText(s, ex.loadType, lang)).join(' · ')}</b>
        </span>
      ) : <span className="muted" style={{ fontSize: 14 }}>{t.firstTime}</span>}
      {last?.we.note && <span className="muted small" style={{ fontStyle: 'italic' }}>„{last.we.note}“</span>}
      {hint && <span className="muted small">{hint}</span>}
      {we.skipped === 1 && (
        <span className="small accent">{t.skipped} · <button className="link-btn" style={{ minHeight: 0, color: 'var(--accent)', fontSize: 13 }} onClick={() => setSkipped(we.id, false)}>{t.unskip}</button></span>
      )}
    </div>
  );
}

function StationView(p: {
  d: Data; station: WorkoutExercise[]; flow: ReturnType<typeof flowOf>; active?: WorkoutSet; nonce: number;
  onActive: (id: string) => void; onToggle: (s: WorkoutSet) => void; onBump: () => void;
  noteOpen: boolean; onNote: () => void; onSwap: (weId: string) => void;
}) {
  const { t, lang } = useT();
  const { d, station, flow } = p;
  const isSuper = station.length > 1;
  const anyNote = station.some((we) => we.note);

  const step = (we: WorkoutExercise, ex: Exercise, s: WorkoutSet, key: 'weightKg' | 'reps', dir: 1 | -1) => {
    const delta = key === 'reps' ? 1 : ex.weightStep;
    const v = Math.max(0, Math.round((s[key] + dir * delta) * 100) / 100);
    updateSet(s.id, { [key]: v });
    // following open sets of the same exercise with the same old value move along
    for (const o of setsOf(d, we.id)) if (o.position > s.position && !o.done && o[key] === s[key]) updateSet(o.id, { [key]: v });
    p.onBump();
  };

  return (
    <>
      {isSuper ? (
        <div className="stack gap12 mt12">
          <div className="stack" style={{ gap: 2 }}>
            <span className="eyebrow accent">{t.superset}</span>
            <span className="muted small">{t.supersetHint}</span>
          </div>
          {station.map((we, k) => {
            const ex = d.ex.get(we.exerciseId);
            if (!ex) return null;
            return (
              <div key={we.id} className="stack gap8" style={{ opacity: we.skipped ? 0.5 : 1 }}>
                <div className="between" style={{ alignItems: 'flex-start' }}>
                  <div className="row" style={{ alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
                    <span className="letter">{LETTERS[k]}</span>
                    <h1 className="h1" style={{ fontSize: 34, lineHeight: 0.95 }}>{exName(ex, lang)}</h1>
                  </div>
                  <button className="icon-btn" style={{ width: 44, height: 44 }} aria-label={t.swapTitle(exName(ex, lang))} onClick={() => p.onSwap(we.id)}>{Icon.swap(18)}</button>
                </div>
                <div style={{ paddingLeft: 44 }}><ExerciseInfo d={d} we={we} ex={ex} /></div>
              </div>
            );
          })}
        </div>
      ) : (() => {
        const we = station[0];
        const ex = d.ex.get(we.exerciseId)!;
        return (
          <>
            <div className="between mt12" style={{ alignItems: 'flex-start' }}>
              <h1 className="h1 md">{exName(ex, lang)}</h1>
              <button className="icon-btn" aria-label={t.swapTitle(exName(ex, lang))} onClick={() => p.onSwap(we.id)}>{Icon.swap()}</button>
            </div>
            <div className="mt8"><ExerciseInfo d={d} we={we} ex={ex} /></div>
          </>
        );
      })()}

      <div className="list mt12" style={{ margin: '12px -20px 0' }}>
        {flow.map((f, i) => {
          const ex = d.ex.get(f.we.exerciseId)!;
          const newRound = isSuper && (i === 0 || flow[i - 1].round !== f.round);
          return (
            <div key={f.set.id} style={{ borderBottom: 0 }}>
              {newRound && <div className="round-label">{t.round} {f.round + 1}</div>}
              <SetRow label={isSuper ? `${f.letter}${f.round + 1}` : String(f.round + 1)} compact={isSuper}
                s={f.set} ex={ex} isActive={p.active?.id === f.set.id} nonce={p.nonce}
                onActive={() => p.onActive(f.set.id)} onToggle={() => p.onToggle(f.set)}
                onStep={(key, dir) => step(f.we, ex, f.set, key, dir)} />
            </div>
          );
        })}
      </div>

      <div className="mt12" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button className="btn" onClick={async () => { if (isSuper) await addRound(d, station); else await addSet(d, station[0].id); p.onActive(''); }}>{isSuper ? t.addRound : t.addSet}</button>
        <button className="btn" onClick={p.onNote} aria-expanded={p.noteOpen}>{anyNote && !p.noteOpen ? `✎ ${t.note}` : t.addNote}</button>
      </div>
      {p.noteOpen && station.map((we, k) => (
        <textarea key={we.id} className="note mt8" autoFocus={k === 0} defaultValue={we.note}
          placeholder={isSuper ? `${t.note} ${LETTERS[k]} · ${exName(d.ex.get(we.exerciseId), lang)}` : t.note} aria-label={`${t.note} ${exName(d.ex.get(we.exerciseId), lang)}`}
          onBlur={(e) => setExerciseNote(we.id, e.target.value.trim())} />
      ))}
    </>
  );
}

function SetRow(p: {
  label: string; compact: boolean; s: WorkoutSet; ex: Exercise; isActive: boolean; nonce: number;
  onActive: () => void; onToggle: () => void; onStep: (key: 'weightKg' | 'reps', dir: 1 | -1) => void;
}) {
  const { t, lang } = useT();
  const { s, ex } = p;
  const bw = ex.loadType === 'bodyweightPlus';
  const unit = bw ? t.addedKg : t.kg;
  const loadLabel = bw ? t.added : ex.loadType === 'perHand' ? t.perHand : t.kg;
  return (
    <div className={`setrow${p.isActive ? ' active' : ''}${s.done ? ' isdone' : ''}${p.compact ? ' compact' : ''}`} style={{ padding: '0 20px' }}>
      <div className="main">
        <button className="n" onClick={p.onActive} aria-label={`${t.set} ${p.label}`}>{p.label}</button>
        <button className="val" onClick={p.onActive}>
          {bw ? '+' : ''}{num(s.weightKg, lang)}<small> {unit} × </small>{s.reps}
        </button>
        <button className={`check${s.done ? ' on' : ''}`} aria-label={`${t.set} ${p.label} ${exName(ex, lang)}`} aria-pressed={!!s.done} onClick={p.onToggle}>{Icon.check()}</button>
      </div>
      {p.isActive && (
        <div className="steppers">
          <div className="stepper">
            <button aria-label="−" onClick={() => p.onStep('weightKg', -1)}>−</button>
            <input key={`w${s.id}${p.nonce}`} id={`w-${s.id}`} className="numin" inputMode="decimal" aria-label={loadLabel}
              defaultValue={num(s.weightKg, lang)} onFocus={(e) => e.target.select()}
              onChange={(e) => { const v = parseNum(e.target.value); if (v !== null) updateSet(s.id, { weightKg: v }); }} />
            <button aria-label="+" onClick={() => p.onStep('weightKg', 1)}>+</button>
          </div>
          <div className="stepper">
            <button aria-label="−" onClick={() => p.onStep('reps', -1)}>−</button>
            <input key={`r${s.id}${p.nonce}`} id={`r-${s.id}`} className="numin" inputMode="numeric" aria-label={t.reps}
              defaultValue={s.reps} onFocus={(e) => e.target.select()}
              onChange={(e) => { const v = parseNum(e.target.value); if (v !== null) updateSet(s.id, { reps: Math.round(v) }); }} />
            <button aria-label="+" onClick={() => p.onStep('reps', 1)}>+</button>
          </div>
          <div className="extra">
            <span className="muted small cond" style={{ letterSpacing: 1 }}>{p.compact ? `${exName(ex, lang)} · ` : ''}{loadLabel} · {t.reps.toUpperCase()}</span>
            <button className="link-btn" style={{ minHeight: 32, fontSize: 13 }} onClick={() => removeSet(s.id)}>{t.removeSet}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function RecentChips({ d, workoutId, onAdded }: { d: Data; workoutId: string; onAdded: (weId: string) => void }) {
  const { t, lang } = useT();
  const inW = new Set(exercisesOf(d, workoutId).map((we) => we.exerciseId));
  const recent: string[] = [];
  const done = d.workouts.filter((w) => w.finishedAt).sort((a, b) => b.startedAt - a.startedAt);
  for (const w of done) for (const we of exercisesOf(d, w.id)) {
    if (inW.has(we.exerciseId) || recent.includes(we.exerciseId)) continue;
    if (setsOf(d, we.id).some((s) => s.done)) recent.push(we.exerciseId);
  }
  const ids = (recent.length ? recent : d.exercises.filter((e) => e.isMine && !inW.has(e.id)).map((e) => e.id)).slice(0, 6);
  if (!ids.length) return null;
  return (
    <>
      <span className="eyebrow mt8">{t.recent}</span>
      <div className="chips">
        {ids.map((id) => (
          <button key={id} className="chip" style={{ minHeight: 44, fontSize: 16 }} onClick={async () => onAdded(await addExerciseToWorkout(d, workoutId, id))}>
            + {exName(d.ex.get(id), lang)}
          </button>
        ))}
      </div>
    </>
  );
}

function SwapSheet({ d, we, ex, list, planId, onClose, onSkipped }: {
  d: Data; we: WorkoutExercise; ex: Exercise; list: WorkoutExercise[]; planId: string | null; onClose: () => void; onSkipped: () => void;
}) {
  const { t, lang } = useT();
  const [inPlan, setInPlan] = useState(false);
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const pool = d.exercises
    .filter((e) => e.id !== ex.id && (query ? `${e.nameDe} ${e.nameEn}`.toLowerCase().includes(query) : e.muscle === ex.muscle))
    .sort((a, b) => b.isMine - a.isMine || exName(a, lang).localeCompare(exName(b, lang)));

  const i = list.findIndex((x) => x.id === we.id);
  const prev = list[i - 1], nxt = list[i + 1];
  const linkedPrev = !!prev && !!we.supersetId && prev.supersetId === we.supersetId;
  const linkedNext = !!nxt && !!we.supersetId && nxt.supersetId === we.supersetId;

  const pick = async (id: string) => { await swapExercise(d, we, id, inPlan && !!planId); onClose(); };
  const link = async (at: number) => { await toggleLink('workoutExercises', list, at); onClose(); };

  return (
    <Sheet onClose={onClose} label={t.swapTitle(exName(ex, lang))}>
      <div className="between">
        <span className="eyebrow">{t.swapTitle(exName(ex, lang))}</span>
        <button className="icon-btn" style={{ width: 44, height: 44 }} aria-label={t.cancel} onClick={onClose}>{Icon.close()}</button>
      </div>
      <h2 className="h1 md" style={{ margin: 0 }}>{t.swapHead}</h2>
      {planId && (
        <div className="seg">
          <button className={!inPlan ? 'on' : ''} onClick={() => setInPlan(false)}>{t.onlyToday}</button>
          <button className={inPlan ? 'on' : ''} onClick={() => setInPlan(true)}>{t.inPlan}</button>
        </div>
      )}
      <label className="field">{Icon.search()}<input id="swap-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search.toUpperCase()} aria-label={t.search} /></label>
      {!query && <span className="eyebrow">{t.sameMuscle} · {t.muscles[ex.muscle]}</span>}
      <div className="list">
        {pool.slice(0, 30).map((e) => {
          const lp = lastPerformance(d, e.id);
          return (
            <button key={e.id} className="item" style={{ borderBottom: '1px solid var(--line)' }} onClick={() => pick(e.id)}>
              <span className="grow">
                <span className="title" style={{ display: 'block' }}>{exName(e, lang)}</span>
                <span className="sub" style={{ display: 'block' }}>{t.equip[e.equipment]}{e.gymNote ? ` · ${e.gymNote}` : ''}</span>
              </span>
              {e.isMine === 1 && <span className="tag">{t.mine}</span>}
              <span className="val">{lp ? setText(lp.sets[0], e.loadType, lang) : t.newEntry.toUpperCase()}</span>
            </button>
          );
        })}
        {!pool.length && <div className="empty">{t.nothingFound}</div>}
      </div>
      <div className="stack gap8">
        {(linkedPrev || linkedNext) ? (
          <button className="btn" onClick={() => link(linkedNext ? i : i - 1)}>{Icon.link()} {t.unlink}</button>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: prev && nxt ? '1fr 1fr' : '1fr', gap: 10 }}>
            {prev && <button className="btn" style={{ fontSize: 15 }} onClick={() => link(i - 1)}>{Icon.link()} {t.linkPrev}</button>}
            {nxt && <button className="btn" style={{ fontSize: 15 }} onClick={() => link(i)}>{Icon.link()} {t.linkNext}</button>}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button className="btn" onClick={async () => { await setSkipped(we.id, true); onSkipped(); }}>{t.skip}</button>
          <button className="btn" onClick={async () => { await moveToEnd(d, we); onClose(); }}>{t.toEnd}</button>
        </div>
      </div>
    </Sheet>
  );
}
