import { useEffect, useState, type ReactNode } from 'react';

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const Icon = {
  check: (s = 24) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={3} aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>,
  swap: (s = 20) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></svg>,
  close: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  search: (s = 20) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>,
  gear: (s = 20) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={2} aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
  link: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={2.25} aria-hidden="true" style={{ marginRight: 6, flex: 'none' }}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>,
  up: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>,
  down: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
};

export function Sheet({ onClose, children, label }: { onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

// ---------- in-app confirm / prompt (native dialogs are blocked in some app views) ----------

type Req = { kind: 'confirm' | 'prompt'; message: string; value: string; ok: string; cancel: string; resolve: (v: string | null) => void };
let pushDialog: (r: Req) => void = () => {};
const labels = { ok: 'OK', cancel: '×' };
export const setDialogLabels = (ok: string, cancel: string) => { labels.ok = ok; labels.cancel = cancel; };

export const ask = {
  confirm: (message: string) => new Promise<boolean>((res) => pushDialog({ kind: 'confirm', message, value: '', ok: labels.ok, cancel: labels.cancel, resolve: (v) => res(v !== null) })),
  prompt: (message: string, value = '') => new Promise<string | null>((res) => pushDialog({ kind: 'prompt', message, value, ok: labels.ok, cancel: labels.cancel, resolve: res }))
};

export function DialogHost() {
  const [req, setReq] = useState<Req | null>(null);
  const [val, setVal] = useState('');
  useEffect(() => { pushDialog = (r) => { setVal(r.value); setReq(r); }; }, []);
  if (!req) return null;
  const close = (v: string | null) => { req.resolve(v); setReq(null); };
  return (
    <Sheet onClose={() => close(null)} label={req.message}>
      <h2 className="h1" style={{ fontSize: 36, margin: 0 }}>{req.message}</h2>
      {req.kind === 'prompt' && (
        <label className="field">
          <input id="dialog-input" autoFocus value={val} onChange={(e) => setVal(e.target.value)} aria-label={req.message}
            onKeyDown={(e) => e.key === 'Enter' && val.trim() && close(val.trim())} />
        </label>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button className="btn" onClick={() => close(null)}>{req.cancel}</button>
        <button className="btn primary" style={{ minHeight: 52, fontSize: 18 }} disabled={req.kind === 'prompt' && !val.trim()}
          onClick={() => close(req.kind === 'prompt' ? val.trim() : '')}>{req.ok}</button>
      </div>
    </Sheet>
  );
}

let pushToast: (m: string) => void = () => {};
export const toast = (m: string) => pushToast(m);

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let timer: number;
    pushToast = (m) => { setMsg(m); clearTimeout(timer); timer = window.setTimeout(() => setMsg(null), 1800); };
  }, []);
  return msg ? <div className="toast" role="status">{msg}</div> : null;
}
