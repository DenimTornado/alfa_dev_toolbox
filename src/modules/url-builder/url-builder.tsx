import { useState } from 'react';
import { useData } from '../../shared/storage/data-context';
import {
  createRow,
  selectionKeys,
  dictionaryNames,
  newId,
} from '../../shared/storage/schema';
import { rowResult } from './utils/generate-url';
import { BuilderRow } from './builder-row';
import { TemplateEditor } from './template-editor';
import styles from '../../app/app.module.css';
export function UrlBuilder() {
  const { data, update } = useData();
  const [status, setStatus] = useState('');
  const [manualCopy, setManualCopy] = useState('');
  const urls = data.urlBuilderRows
    .map((row) => rowResult(data, row).url)
    .filter(Boolean);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied to clipboard.');
      setManualCopy('');
    } catch {
      setManualCopy(text);
      setStatus(
        'Clipboard unavailable. Select and copy the text below manually.',
      );
    }
  };
  return (
    <>
      <header className={styles.pageHeader}>
        <h1>URL Builder</h1>
        <a href="#/dictionaries">Dictionaries ↗</a>
      </header>
      <section className={`${styles.panel} ${styles.builderPanel}`}>
        <div className={styles.panelHeader}>
          <div className={styles.inline}>
            <h2>Link workspace</h2>
            <span className={styles.count}>{data.urlBuilderRows.length}</span>
          </div>
          <div className={styles.actions}>
            <button
              className="button is-small"
              disabled={!urls.length}
              onClick={() => void copy(urls.join('\n'))}
            >
              Copy all <span className={styles.keyHint}>{urls.length}</span>
            </button>
            <button
              className="button is-small is-primary"
              onClick={() =>
                update((previous) => ({
                  ...previous,
                  urlBuilderRows: [
                    ...previous.urlBuilderRows,
                    createRow(previous.templates[0]?.id),
                  ],
                }))
              }
            >
              + Add row
            </button>
          </div>
        </div>
        <div className={styles.builderScroll}>
          <table className={`table is-fullwidth ${styles.builderTable}`}>
            <thead>
              <tr>
                <th>#</th>
                <th>Template</th>
                {selectionKeys.map((key) => (
                  <th key={key}>
                    {key === 'profiles'
                      ? 'Profile ID'
                      : dictionaryNames[key].replace(/s$/, '')}
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            {data.urlBuilderRows.map((row, index) => (
              <BuilderRow
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
            {urls.length} of {data.urlBuilderRows.length} ready
          </span>
        </div>
      </section>
      <p className={styles.copyStatus} role="status">
        {status}
      </p>
      {manualCopy && (
        <textarea
          className={`textarea ${styles.mono}`}
          aria-label="Copy URLs manually"
          readOnly
          value={manualCopy}
          onFocus={(event) => event.target.select()}
        />
      )}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.inline}>
            <h2>Saved presets</h2>
            <span className={styles.count}>{data.presets.length}</span>
          </div>
        </div>
        {!data.presets.length ? (
          <p className={styles.empty}>No saved presets.</p>
        ) : (
          <div className={styles.presets}>
            {data.presets.map((preset) => (
              <div className={styles.preset} key={preset.id}>
                <div>
                  <strong>{preset.name}</strong>
                  <small>
                    {data.templates.find(
                      (item) => item.id === preset.templateId,
                    )?.name || 'Select a new template'}
                  </small>
                </div>
                <button
                  className="button is-small"
                  onClick={() =>
                    update((previous) => ({
                      ...previous,
                      urlBuilderRows: [
                        ...previous.urlBuilderRows,
                        {
                          id: newId(),
                          templateId: preset.templateId,
                          selections: { ...preset.selections },
                          queryParams: structuredClone(preset.queryParams),
                        },
                      ],
                    }))
                  }
                >
                  Use preset
                </button>
                <button
                  className="button is-small"
                  aria-label={`Delete preset ${preset.name}`}
                  onClick={() =>
                    update((previous) => ({
                      ...previous,
                      presets: previous.presets.filter(
                        (item) => item.id !== preset.id,
                      ),
                    }))
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      <TemplateEditor />
    </>
  );
}
