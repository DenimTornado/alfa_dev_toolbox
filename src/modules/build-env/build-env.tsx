import { useState } from 'react';
import { useData } from '../../shared/storage/data-context';
import { createBuildEnvRow } from './types';
import { BuildEnvRowEditor } from './build-env-row';
import { buildRowResult } from './utils/build-row-result';
import styles from '../../app/app.module.css';
export function BuildEnv() {
  const { data, update } = useData();
  const [status, setStatus] = useState('');
  const [manual, setManual] = useState('');
  const commands = data.buildEnvRows
    .map((row) => buildRowResult(data, row).command)
    .filter(Boolean);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied to clipboard.');
      setManual('');
    } catch {
      setManual(text);
      setStatus('Clipboard unavailable. Copy the text below manually.');
    }
  };
  return (
    <>
      <header className={styles.pageHeader}>
        <h1>Build ENV</h1>
        <a href="#/dictionaries?tab=buildApps">Feature branches ↗</a>
      </header>
      <section className={`${styles.panel} ${styles.builderPanel}`}>
        <div className={styles.panelHeader}>
          <h2>Build workspace</h2>
          <div className={styles.actions}>
            <button
              className="button is-small"
              disabled={!commands.length}
              onClick={() => void copy(commands.join('\n'))}
            >
              Copy All
            </button>
            <button
              className="button is-small is-primary"
              onClick={() =>
                update((previous) => ({
                  ...previous,
                  buildEnvRows: [
                    ...previous.buildEnvRows,
                    createBuildEnvRow(
                      previous.dictionaries.buildApps[0]?.id,
                      previous.dictionaries.versions[0]?.id,
                    ),
                  ],
                }))
              }
            >
              + Add row
            </button>
          </div>
        </div>
        <div className={styles.builderScroll}>
          <table className={`table is-fullwidth ${styles.buildTable}`}>
            <thead>
              <tr>
                <th>#</th>
                <th>Feature branch</th>
                <th>Instance</th>
                <th>Actions</th>
              </tr>
            </thead>
            {data.buildEnvRows.map((row, index) => (
              <BuildEnvRowEditor
                key={row.id}
                row={row}
                index={index}
                copy={(text) => void copy(text)}
              />
            ))}
          </table>
        </div>
        <div className={styles.panelFooter}>
          <span className={styles.muted}>
            {'{{app}} · {{application}} · {{version}}'}
          </span>
          <span className={styles.muted}>
            {commands.length} of {data.buildEnvRows.length} ready
          </span>
        </div>
      </section>
      <p className={styles.envStatus} role="status">
        {status}
      </p>
      {manual && (
        <textarea
          className={`textarea ${styles.mono}`}
          readOnly
          aria-label="Copy build arguments manually"
          value={manual}
          onFocus={(event) => event.target.select()}
        />
      )}
    </>
  );
}
