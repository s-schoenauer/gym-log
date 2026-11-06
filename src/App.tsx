import { useEffect, useState } from 'react';
import { useData, activeWorkout } from './repo';
import { LangCtx, dicts } from './i18n';
import { Today } from './screens/Today';
import { WorkoutScreen } from './screens/Workout';
import { Finish } from './screens/Finish';
import { Stats } from './screens/Stats';
import { Plans } from './screens/Plans';
import { Library } from './screens/Library';
import { SettingsScreen } from './screens/Settings';
import { DialogHost, setDialogLabels } from './ui';

/** Hash routes keep the app working on any static host and from the home screen. */
export interface Route { name: string; arg?: string; q: URLSearchParams }

function parse(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, query] = h.split('?');
  const [name, arg] = path.split('/');
  return { name: name || 'today', arg, q: new URLSearchParams(query) };
}

export const go = (hash: string) => { location.hash = hash; };

export function App() {
  const [route, setRoute] = useState(parse);
  const data = useData();

  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  if (!data) return <div className="app" />;
  const lang = data.settings.language;
  const t = dicts[lang];
  const running = activeWorkout(data);
  setDialogLabels('OK', t.cancel);

  let screen;
  switch (route.name) {
    case 'workout': screen = <WorkoutScreen d={data} />; break;
    case 'finish': screen = <Finish d={data} workoutId={route.arg!} />; break;
    case 'stats': screen = <Stats d={data} q={route.q} />; break;
    case 'plans': screen = <Plans d={data} open={route.arg} />; break;
    case 'library': screen = <Library d={data} q={route.q} />; break;
    case 'settings': screen = <SettingsScreen d={data} />; break;
    default: screen = <Today d={data} />;
  }
  const hideNav = route.name === 'workout' || route.name === 'finish' || (route.name === 'library' && route.q.get('pick'));
  const tab = route.name === 'workout' ? 'workout' : route.name === 'library' || route.name === 'settings' ? 'plans' : route.name;

  return (
    <LangCtx.Provider value={lang}>
      <div className="app">{screen}</div>
      <DialogHost />
      {!hideNav && (
        <nav className="nav" aria-label="Navigation">
          <div className="nav-inner">
            <a href="#/" className={tab === 'today' ? 'on' : ''}>{t.today}</a>
            <a href="#/workout" className={tab === 'workout' ? 'on' : ''}>{t.log}{running && <span className="dot" aria-label={t.running} />}</a>
            <a href="#/stats" className={tab === 'stats' ? 'on' : ''}>{t.stats}</a>
            <a href="#/plans" className={tab === 'plans' ? 'on' : ''}>{t.plans}</a>
          </div>
        </nav>
      )}
    </LangCtx.Provider>
  );
}
