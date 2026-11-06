import type React from 'react';
import { useState } from 'react';
import {
  type Data, planItemsOf, createPlan, duplicatePlan, removePlanItem, moveStation, setPlanStatus,
  renamePlan, deletePlan, setDefaultSets, stations, toggleLink
} from '../repo';
import type { PlanItem } from '../db';
import { useT, exName } from '../i18n';
import { Icon, ask } from '../ui';

export function Plans({ d, open }: { d: Data; open?: string }) {
  const { t, lang } = useT();
  const [openId, setOpenId] = useState<string | null>(open ?? null);

  const newPlan = async () => {
    const name = await ask.prompt(t.planName);
    if (!name) return;
    const id = await createPlan(d, name);
    setOpenId(id);
  };

  return (
    <main className="screen">
      <div className="between">
        <h1 className="h1" style={{ fontSize: 64 }}>{t.plans}</h1>
        <div className="row" style={{ gap: 8 }}>
          <a className="btn sm" href="#/library">{t.exercises}</a>
          <a className="icon-btn" style={{ width: 44, height: 44 }} href="#/settings" aria-label={t.settings}>{Icon.gear()}</a>
        </div>
      </div>

      <div className="list mt16" style={{ margin: '16px -20px 0' }}>
        {d.plans.map((p) => {
          const isOpen = openId === p.id;
          const items = planItemsOf(d, p.id);
          const paused = p.status === 'paused';
          return (
            <div key={p.id} style={{ background: isOpen ? 'var(--surface)' : 'transparent' }}>
              <button className="split on" style={{ minHeight: 64, padding: '0 20px', color: paused ? 'var(--off)' : isOpen ? 'var(--text)' : '#d4d4d4' }}
                aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? null : p.id)}>
                <span className="name">{p.name}</span>
                <span className="meta">{paused ? <span className="tag" style={{ borderColor: 'var(--line-2)', color: 'var(--muted)' }}>{t.paused}</span> : t.exercisesN(items.length)}</span>
              </button>
              {isOpen && (
                <div style={{ padding: '0 20px 16px' }}>
                  {items.length === 0 && <div className="empty">{t.noExercises}</div>}
                  {stations(items).map((st, si, all) => {
                    const arrows = (
                      <div className="stack">
                        <button className="link-btn" style={{ minHeight: 24, color: si === 0 ? '#2a2a2a' : 'var(--muted)' }} disabled={si === 0} aria-label="↑" onClick={() => moveStation(d, p.id, si, -1)}>{Icon.up()}</button>
                        <button className="link-btn" style={{ minHeight: 24, color: si === all.length - 1 ? '#2a2a2a' : 'var(--muted)' }} disabled={si === all.length - 1} aria-label="↓" onClick={() => moveStation(d, p.id, si, 1)}>{Icon.down()}</button>
                      </div>
                    );
                    const linkAfter = (it: PlanItem) => {
                      const i = items.indexOf(it);
                      if (i >= items.length - 1) return null;
                      const linked = !!it.supersetId && it.supersetId === items[i + 1].supersetId;
                      return (
                        <button className="linkrow" style={{ color: linked ? 'var(--accent)' : '#6b6b6b' }} aria-pressed={linked}
                          aria-label={linked ? t.unlink : `${t.makeSuperset}: ${exName(d.ex.get(it.exerciseId), lang)} + ${exName(d.ex.get(items[i + 1].exerciseId), lang)}`}
                          onClick={() => toggleLink('planItems', items, i)}>
                          {Icon.link(16)}{linked ? t.unlink : t.makeSuperset}
                        </button>
                      );
                    };
                    if (st.length === 1) {
                      const it = st[0];
                      return (
                        <div key={it.id}>
                          <ItemRow d={d} it={it} lead={arrows} />
                          {linkAfter(it)}
                        </div>
                      );
                    }
                    return (
                      <div key={it0(st)}>
                        <div className="sgroup">
                          <div className="between" style={{ minHeight: 40 }}>
                            <span className="eyebrow accent" style={{ fontSize: 13 }}>{t.superset}</span>
                            <div className="row" style={{ gap: 0 }}>
                              <button className="link-btn" style={{ minHeight: 36, padding: '0 6px', color: si === 0 ? '#2a2a2a' : 'var(--muted)' }} disabled={si === 0} aria-label="↑" onClick={() => moveStation(d, p.id, si, -1)}>{Icon.up()}</button>
                              <button className="link-btn" style={{ minHeight: 36, padding: '0 6px', color: si === all.length - 1 ? '#2a2a2a' : 'var(--muted)' }} disabled={si === all.length - 1} aria-label="↓" onClick={() => moveStation(d, p.id, si, 1)}>{Icon.down()}</button>
                            </div>
                          </div>
                          {st.map((it, k) => (
                            <div key={it.id}>
                              <ItemRow d={d} it={it} lead={<span className="letter" style={{ width: 28, height: 28, fontSize: 16 }}>{'ABCDEFGH'[k]}</span>} />
                              {k < st.length - 1 && linkAfter(it)}
                            </div>
                          ))}
                        </div>
                        {linkAfter(st[st.length - 1])}
                      </div>
                    );
                  })}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                    <a className="btn" style={{ minHeight: 48 }} href={`#/library?pick=plan:${p.id}`}>{t.addExercise}</a>
                    <button className="btn" style={{ minHeight: 48 }} onClick={async () => {
                      const name = await ask.prompt(t.planName, `${p.name} B`);
                      if (name) setOpenId(await duplicatePlan(d, p, name));
                    }}>{t.duplicate}</button>
                  </div>
                  <div className="row mt8" style={{ justifyContent: 'space-between' }}>
                    <button className="link-btn" onClick={async () => { const n = await ask.prompt(t.planName, p.name); if (n) renamePlan(p.id, n); }}>{t.rename}</button>
                    <button className="link-btn" style={{ color: paused ? 'var(--accent)' : 'var(--muted)' }} onClick={() => setPlanStatus(p.id, paused ? 'active' : 'paused')}>{paused ? t.activate : t.pause}</button>
                    <button className="link-btn" onClick={async () => { if (await ask.confirm(t.confirmDelete)) { deletePlan(d, p.id); setOpenId(null); } }}>{t.delete}</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn primary block mt24" onClick={newPlan}>{t.newPlan}</button>
    </main>
  );
}

const it0 = (st: PlanItem[]) => st[0].id;

function ItemRow({ d, it, lead }: { d: Data; it: PlanItem; lead: React.ReactNode }) {
  const { t, lang } = useT();
  const ex = d.ex.get(it.exerciseId);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto 44px', gap: 8, alignItems: 'center', minHeight: 56 }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>{lead}</div>
      <span className="stack" style={{ minWidth: 0 }}>
        <span className="cond" style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.05 }}>{exName(ex, lang)}</span>
        <span className="small muted">{t.equip[ex?.equipment ?? 'machine']}</span>
      </span>
      <span className="row" style={{ gap: 4 }}>
        <button className="roundbtn" style={{ width: 32, height: 32, fontSize: 18 }} aria-label={`${t.setsShort} −`} onClick={() => setDefaultSets(it.id, it.defaultSets - 1)}>−</button>
        <span className="cond" style={{ fontSize: 16, fontWeight: 800, minWidth: 32, textAlign: 'center' }}>{it.defaultSets}×</span>
        <button className="roundbtn" style={{ width: 32, height: 32, fontSize: 18 }} aria-label={`${t.setsShort} +`} onClick={() => setDefaultSets(it.id, it.defaultSets + 1)}>+</button>
      </span>
      <button className="roundbtn" aria-label={t.delete} onClick={() => removePlanItem(d, it)}>{Icon.close(16)}</button>
    </div>
  );
}
