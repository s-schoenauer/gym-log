import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import './styles.css';
import { App } from './App';
import { seedIfEmpty } from './seed';

seedIfEmpty().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

// Ask the browser not to evict our data (honoured for installed apps).
navigator.storage?.persist?.().catch(() => {});
