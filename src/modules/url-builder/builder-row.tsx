import { useData } from '../../shared/storage/data-context';
import {
  selectionKeys,
  dictionaryNames,
  newId,
  createRow,
  type UrlBuilderRow,
} from '../../shared/storage/schema';
import { SearchSelect } from '../../shared/components/search-select';
import { QueryParamsEditor } from './query-params-editor';
import { rowResult } from './utils/generate-url';
import styles from '../../app/app.module.css';
export function BuilderRow({
  row,
  index,
  copy,
}: {
  row: UrlBuilderRow;
  index: number;
  copy: (text: string) => void;
}) {
  const { data, update } = useData();
  const { url, error } = rowResult(data, row);
  const change = (next: UrlBuilderRow) =>
    update((previous) => ({
      ...previous,
      urlBuilderRows: previous.urlBuilderRows.map((item) =>
        item.id === row.id ? next : item,
      ),
    }));
  return (
    <tbody className={styles.rowGroup}>
      <tr>
        <td className={styles.rowNumber}>
          {String(index + 1).padStart(2, '0')}
        </td>
        <td>
          <select
            aria-label={`Template row ${index + 1}`}
            className="input is-small"
            value={row.templateId}
            onChange={(event) =>
              change({ ...row, templateId: event.target.value })
            }
          >
            <option value="">Select template</option>
            {data.templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </td>
        {selectionKeys.map((key) => (
          <td key={key}>
            <SearchSelect
              label={`${dictionaryNames[key]} row ${index + 1}`}
              items={data.dictionaries[key]}
              value={row.selections[key]}
              onChange={(id) =>
                change({ ...row, selections: { ...row.selections, [key]: id } })
              }
            />
          </td>
        ))}
        <td>
          <div className={styles.actions}>
            <button
              className="button is-small"
              title="Duplicate row"
              aria-label={`Duplicate row ${index + 1}`}
              onClick={() =>
                update((previous) => ({
                  ...previous,
                  urlBuilderRows: [
                    ...previous.urlBuilderRows,
                    { ...structuredClone(row), id: newId() },
                  ],
                }))
              }
            >
              ⧉
            </button>
            <button
              className="button is-small"
              title="Delete row"
              aria-label={`Delete row ${index + 1}`}
              disabled={data.urlBuilderRows.length === 1}
              onClick={() =>
                update((previous) => ({
                  ...previous,
                  urlBuilderRows: previous.urlBuilderRows.filter(
                    (item) => item.id !== row.id,
                  ),
                }))
              }
            >
              ×
            </button>
          </div>
        </td>
      </tr>
      <tr className={styles.queryParamsRow}>
        <td />
        <td colSpan={6}>
          <QueryParamsEditor
            params={row.queryParams}
            keys={data.dictionaries.queryKeys}
            rowNumber={index + 1}
            onChange={(queryParams) => change({ ...row, queryParams })}
          />
        </td>
      </tr>
      <tr className={styles.resultRow}>
        <td />
        <td colSpan={5}>
          {url ? (
            <input
              className={styles.urlOutput}
              aria-label={`Generated URL row ${index + 1}`}
              readOnly
              value={url}
              onFocus={(event) => event.target.select()}
            />
          ) : (
            <p className={styles.error}>{error}</p>
          )}
        </td>
        <td>
          <div className={styles.actions}>
            <button
              className="button is-small"
              disabled={!url}
              onClick={() => copy(url)}
            >
              Copy
            </button>
            <a
              className={`button is-small ${!url ? styles.disabled : ''}`}
              href={url || undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!url}
              tabIndex={url ? 0 : -1}
            >
              Open ↗
            </a>
          </div>
        </td>
      </tr>
      <tr className={styles.rowTools}>
        <td />
        <td colSpan={6}>
          <button
            onClick={() => {
              const name = prompt('Preset name');
              if (name?.trim())
                update((previous) => ({
                  ...previous,
                  presets: [
                    ...previous.presets,
                    { ...structuredClone(row), id: newId(), name: name.trim() },
                  ],
                }));
            }}
          >
            Save as preset
          </button>
          <span>·</span>
          <button
            onClick={() => change({ ...createRow(row.templateId), id: row.id })}
          >
            Reset selections
          </button>
        </td>
      </tr>
    </tbody>
  );
}
