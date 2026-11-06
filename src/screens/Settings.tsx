import { useEffect, useRef, useState } from 'react';
import { type Data, setLanguage, exportJson, importJson, todayKey } from '../repo';
import { useT } from '../i18n';
import { ask } from '../ui';

export function SettingsScreen({ d }: { d: Data }) {
  const { t, lang } = useT();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [msg, setMsg] = useState('');
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => { navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(false)); }, []);

  const doExport = async () => {
    const blob = new Blob([await exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gymlog-${todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const doImport = async (f: File) => {
    try {
      await importJson(await f.text());
      setMsg(t.importOk);
    } catch {
      setMsg(t.importFail);
    }
  };

  const finished = d.workouts.filter((w) => w.finishedAt).length;

  return (
    <main className="screen">
      <a className="link-btn" href="#/plans">← {t.plans}</a>
      <h1 className="h1 md mt8">{t.settings}</h1>

      <span className="eyebrow mt24">{t.language}</span>
      <div className="seg mt8">
        <button className={lang === 'de' ? 'on' : ''} onClick={() => setLanguage('de')}>Deutsch</button>
        <button className={lang === 'en' ? 'on' : ''} onClick={() => setLanguage('en')}>English</button>
      </div>

      <span className="eyebrow mt24">{t.backup}</span>
      <p className="muted small" style={{ margin: '8px 0 0' }}>{t.backupHint}</p>
      <p className="small" style={{ margin: '8px 0 0', color: persisted ? 'var(--accent)' : 'var(--muted)' }}>{persisted === null ? '' : persisted ? `✓ ${t.persistOk}` : t.persistNo}</p>
      <div className="mt12" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button className="btn" onClick={doExport}>{t.exportBtn}</button>
        <button className="btn" onClick={() => file.current?.click()}>{t.importBtn}</button>
      </div>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f && (await ask.confirm(`${t.importBtn}?`))) doImport(f); }} />
      {msg && <p className="small mt8" role="status">{msg}</p>}

      <p className="muted small mt24">{d.exercises.length} {t.exercises} · {d.plans.length} {t.plans} · {t.trainings(finished)}</p>
    </main>
  );
}
