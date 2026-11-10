import { useData } from '../../shared/storage/data-context';
import { newId } from '../../shared/storage/schema';
import { SearchSelect } from '../../shared/components/search-select';
import { createBuildEnvRow, type BuildEnvRow } from './types';
import { buildRowResult } from './utils/build-row-result';
import styles from '../../app/app.module.css';
export function BuildEnvRowEditor({
  row,
  index,
  copy,
}: {
  row: BuildEnvRow;
  index: number;
  copy: (text: string) => void;
}) {
  const { data, update } = useData();
  const result = buildRowResult(data, row);
  const change = (fields: Partial<BuildEnvRow>) =>
    update((previous) => ({
      ...previous,
      buildEnvRows: previous.buildEnvRows.map((item) =>
        item.id === row.id ? { ...item, ...fields } : item,
      ),
    }));
  return (
    <tbody>
      <tr>
        <td className={styles.rowNumber}>
          {String(index + 1).padStart(2, '0')}
        </td>
        <td>
          <SearchSelect
            label={`Build app row ${index + 1}`}
            items={data.dictionaries.buildApps}
            value={row.appId}
            onChange={(appId) => change({ appId })}
          />
        </td>
        <td>
          <SearchSelect
            label={`Build instance row ${index + 1}`}
            items={data.dictionaries.versions}
            value={row.versionId}
            onChange={(versionId) => change({ versionId })}
          />
        </td>
        <td>
          <div className={styles.actions}>
            <button
              className="button is-small"
              aria-label={`Duplicate build row ${index + 1}`}
              onClick={() =>
                update((previous) => ({
                  ...previous,
                  buildEnvRows: [
                    ...previous.buildEnvRows,
                    { ...structuredClone(row), id: newId() },
                  ],
                }))
              }
            >
              ⧉
            </button>
            <button
              className="button is-small"
              disabled={data.buildEnvRows.length === 1}
              aria-label={`Delete build row ${index + 1}`}
              onClick={() =>
                update((previous) => ({
                  ...previous,
                  buildEnvRows: previous.buildEnvRows.filter(
                    (item) => item.id !== row.id,
                  ),
                }))
              }
            >
              ×
            </button>
            <button
              className="button is-small"
              onClick={() =>
                change({
                  ...createBuildEnvRow(row.appId, row.versionId),
                  id: row.id,
                })
              }
            >
              Reset
            </button>
          </div>
        </td>
      </tr>
      <tr>
        <td />
        <td colSpan={3}>
          <div className={styles.buildPatterns}>
            <label>
              context_root
              <input
                className={`input is-small ${styles.mono}`}
                aria-label={`Context root pattern row ${index + 1}`}
                value={row.contextRootPattern}
                onChange={(event) =>
                  change({ contextRootPattern: event.target.value })
                }
              />
            </label>
            <label>
              application_name
              <input
                className={`input is-small ${styles.mono}`}
                aria-label={`Application name pattern row ${index + 1}`}
                value={row.applicationNamePattern}
                onChange={(event) =>
                  change({ applicationNamePattern: event.target.value })
                }
              />
            </label>
          </div>
        </td>
      </tr>
      <tr>
        <td />
        <td colSpan={3}>
          <div className={styles.queryParams}>
            <div className={styles.queryParamsHeader}>
              <span>Custom ENV</span>
              <button
                className="button is-small"
                onClick={() =>
                  change({
                    customVariables: [
                      ...row.customVariables,
                      { id: newId(), name: '', value: '' },
                    ],
                  })
                }
              >
                + Add ENV
              </button>
            </div>
            {row.customVariables.map((variable, variableIndex) => (
              <div className={styles.queryParam} key={variable.id}>
                <input
                  className={`input is-small ${styles.mono}`}
                  aria-label={`ENV name ${variableIndex + 1} row ${index + 1}`}
                  placeholder="Name"
                  value={variable.name}
                  onChange={(event) =>
                    change({
                      customVariables: row.customVariables.map((item) =>
                        item.id === variable.id
                          ? { ...item, name: event.target.value }
                          : item,
                      ),
                    })
                  }
                />
                <span>=</span>
                <input
                  className={`input is-small ${styles.mono}`}
                  aria-label={`ENV value ${variableIndex + 1} row ${index + 1}`}
                  placeholder="Value"
                  value={variable.value}
                  onChange={(event) =>
                    change({
                      customVariables: row.customVariables.map((item) =>
                        item.id === variable.id
                          ? { ...item, value: event.target.value }
                          : item,
                      ),
                    })
                  }
                />
                <button
                  className="button is-small"
                  aria-label={`Remove ENV ${variableIndex + 1} row ${index + 1}`}
                  onClick={() =>
                    change({
                      customVariables: row.customVariables.filter(
                        (item) => item.id !== variable.id,
                      ),
                    })
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </td>
      </tr>
      <tr className={styles.buildResult}>
        <td />
        <td colSpan={2}>
          {result.error ? (
            <p className={styles.error}>{result.error}</p>
          ) : (
            <textarea
              rows={2}
              className={styles.urlOutput}
              aria-label={`Build arguments row ${index + 1}`}
              value={result.command}
              readOnly
              onFocus={(event) => event.target.select()}
            />
          )}
        </td>
        <td>
          <button
            className="button is-small"
            disabled={!result.command}
            onClick={() => copy(result.command)}
          >
            Copy
          </button>
        </td>
      </tr>
    </tbody>
  );
}
