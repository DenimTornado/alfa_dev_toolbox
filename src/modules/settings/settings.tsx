import { useState } from 'react';
import { useData } from '../../shared/storage/data-context';
import {
  createDefaults,
  dictionaryKeys,
  validateData,
  type AppData,
} from '../../shared/storage/schema';
import { importData } from '../../shared/storage/import-data';
import { readOriginalData } from '../../shared/storage/storage';
import styles from '../../app/app.module.css';
function download(text: string, name: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Settings() {
  const { data, update, blocked, enableSaving } = useData();
  const [incoming, setIncoming] = useState<AppData | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [message, setMessage] = useState('');
  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <h1>Settings</h1>
        </div>
      </header>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Appearance</h2>
          </div>
        </div>
        <div className={styles.themeOptions}>
          {(['light', 'dark', 'system'] as const).map((theme) => (
            <button
              key={theme}
              aria-pressed={data.settings.theme === theme}
              className={`${styles.themeOption} ${data.settings.theme === theme ? styles.themeSelected : ''}`}
              onClick={() =>
                update((previous) => ({ ...previous, settings: { theme } }))
              }
            >
              <span>
                {theme === 'light' ? '☀' : theme === 'dark' ? '☾' : '◐'}
              </span>
              {theme[0].toUpperCase() + theme.slice(1)}
            </button>
          ))}
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Backup & transfer</h2>
            <p>Export your complete workspace or restore a JSON backup.</p>
          </div>
          <button
            className="button is-small"
            onClick={() =>
              download(
                JSON.stringify(data, null, 2),
                `dev-toolbox-${new Date().toISOString().slice(0, 10)}.json`,
              )
            }
          >
            ↓ Export JSON
          </button>
        </div>
        <label className={styles.importZone}>
          Import workspace
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              setIncoming(null);
              setMessage('');
              if (!file) return;
              try {
                if (file.size > 10 * 1024 * 1024)
                  throw new Error('Backup exceeds the 10 MB limit.');
                setIncoming(validateData(JSON.parse(await file.text())));
              } catch (error) {
                setMessage(
                  `Cannot import: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
                );
              }
              event.target.value = '';
            }}
          />
          <small>JSON backups · schema versions 1–4 · up to 10 MB</small>
        </label>
        {incoming && (
          <div className={styles.importPreview}>
            <h3>Import preview</h3>
            <p>
              {dictionaryKeys.reduce(
                (sum, key) => sum + incoming.dictionaries[key].length,
                0,
              )}{' '}
              dictionary entries · {incoming.templates.length} templates ·{' '}
              {incoming.presets.length} presets ·{' '}
              {incoming.urlBuilderRows.length} rows ·{' '}
              {incoming.buildEnvRows.length} build rows ·{' '}
              {incoming.settings.theme} theme
            </p>
            <label>
              Import mode
              <select
                className="input is-small"
                value={mode}
                onChange={(event) =>
                  setMode(
                    event.target.value === 'replace' ? 'replace' : 'merge',
                  )
                }
              >
                <option value="merge">
                  Merge — combine without duplicate values
                </option>
                <option value="replace">
                  Replace — replace entire workspace
                </option>
              </select>
            </label>
            <p className={styles.muted}>
              {mode === 'merge'
                ? 'Current theme is retained. References are remapped to merged entries.'
                : 'All current dictionaries, templates, presets, rows and settings will be replaced.'}
            </p>
            <button
              className="button is-small is-primary"
              onClick={() => {
                if (
                  mode === 'replace' &&
                  !confirm(
                    'Replace all current workspace data with this backup?',
                  )
                )
                  return;
                update((previous) => importData(previous, incoming, mode));
                setIncoming(null);
                setMessage('Import complete.');
              }}
            >
              Import {mode === 'merge' ? '& merge' : '& replace'}
            </button>
          </div>
        )}
      </section>
      {blocked && (
        <section className={styles.panel}>
          <h2>Storage recovery</h2>
          <p>
            Saving is paused to protect the original stored data. Export it
            before enabling saving. Current in-memory data will replace it.
          </p>
          <div className={styles.actions}>
            <button
              className="button is-small"
              onClick={() => {
                try {
                  const raw = readOriginalData();
                  if (raw === null) {
                    setMessage('No original data is available.');
                    return;
                  }
                  download(raw, 'dev-toolbox-original.json');
                } catch {
                  setMessage('Browser does not allow reading localStorage.');
                }
              }}
            >
              Export original data
            </button>
            <button
              className="button is-small is-warning"
              onClick={() => {
                if (
                  confirm(
                    'Enable saving and overwrite original storage with the current workspace?',
                  )
                )
                  enableSaving();
              }}
            >
              Enable saving
            </button>
          </div>
        </section>
      )}
      <section className={`${styles.panel} ${styles.dangerPanel}`}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Reset workspace</h2>
            <p>
              Remove your data and restore the default dictionaries and
              template.
            </p>
          </div>
          <button
            className="button is-small is-danger is-light"
            onClick={() => {
              if (
                confirm(
                  'Reset all data? Your dictionaries, templates, presets and rows will be replaced with default data. Export a backup first.',
                )
              ) {
                update(() => createDefaults());
                if (blocked) enableSaving();
                setMessage('Workspace reset to default data.');
              }
            }}
          >
            Reset all data
          </button>
        </div>
      </section>
      <p role="status" className={styles.notice}>
        {message}
      </p>
    </>
  );
}
