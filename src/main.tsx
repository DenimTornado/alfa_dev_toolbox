import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'bulma/css/bulma.min.css';
import './app/global.css';
import { App } from './app/app';
import { DataProvider } from './shared/storage/data-context';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <App />
    </DataProvider>
  </StrictMode>,
);
