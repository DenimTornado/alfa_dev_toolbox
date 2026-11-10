import { SearchSelect } from '../../shared/components/search-select';
import {
  newId,
  type DictionaryItem,
  type QueryParam,
} from '../../shared/storage/schema';
import styles from '../../app/app.module.css';
export function QueryParamsEditor({
  params,
  keys,
  rowNumber,
  onChange,
}: {
  params: QueryParam[];
  keys: DictionaryItem[];
  rowNumber: number;
  onChange: (params: QueryParam[]) => void;
}) {
  const change = (id: string, update: Partial<QueryParam>) =>
    onChange(
      params.map((param) =>
        param.id === id ? { ...param, ...update } : param,
      ),
    );
  return (
    <div className={styles.queryParams}>
      <div className={styles.queryParamsHeader}>
        <span>GET parameters</span>
        <button
          className="button is-small"
          onClick={() =>
            onChange([...params, { id: newId(), keyId: '', value: '' }])
          }
        >
          + Add parameter
        </button>
        <a href="#/dictionaries?tab=queryKeys">Manage keys ↗</a>
      </div>
      {params.map((param, index) => (
        <div className={styles.queryParam} key={param.id}>
          <SearchSelect
            items={keys}
            value={param.keyId}
            onChange={(keyId) => change(param.id, { keyId })}
            label={`GET key ${index + 1} row ${rowNumber}`}
          />
          <span>=</span>
          <input
            className={`input is-small ${styles.mono}`}
            aria-label={`GET value ${index + 1} row ${rowNumber}`}
            placeholder="Value (empty is allowed)"
            value={param.value}
            onChange={(event) =>
              change(param.id, { value: event.target.value })
            }
          />
          <button
            className="button is-small"
            aria-label={`Remove GET parameter ${index + 1} row ${rowNumber}`}
            onClick={() =>
              onChange(params.filter((item) => item.id !== param.id))
            }
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
