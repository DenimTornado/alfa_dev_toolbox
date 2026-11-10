import { useState } from 'react';
import { useData } from '../../shared/storage/data-context';
import {
  dictionaryKeys,
  dictionaryNames,
  type DictionaryItem,
  type DictionaryKey,
} from '../../shared/storage/schema';
import { AddEntryForm } from './add-entry-form';
import {
  addItem,
  addFeatureBranches,
  addValues,
  editItem,
} from './dictionary-utils';
import styles from '../../app/app.module.css';
export function Dictionaries() {
  const { data, update } = useData();
  const [active, setActive] = useState<DictionaryKey>(() => {
    const tab = new URLSearchParams(location.hash.split('?')[1]).get('tab');
    return dictionaryKeys.find((key) => key === tab) ?? dictionaryKeys[0];
  });
  const [search, setSearch] = useState('');
  const [bulk, setBulk] = useState('');
  const [editing, setEditing] = useState<DictionaryItem | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const items = data.dictionaries[active];
  const write = (next: DictionaryItem[]) =>
    update((previous) => ({
      ...previous,
      dictionaries: { ...previous.dictionaries, [active]: next },
    }));
  const move = (id: string, direction: number) => {
    const next = [...items];
    const from = next.findIndex((item) => item.id === id);
    const to = from + direction;
    if (to < 0 || to >= next.length) return;
    [next[from], next[to]] = [next[to], next[from]];
    write(next);
  };
  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <h1>Dictionaries</h1>
        </div>
        <span className={styles.badge}>
          {dictionaryKeys.reduce(
            (sum, key) => sum + data.dictionaries[key].length,
            0,
          )}{' '}
          entries
        </span>
      </header>
      <div className={styles.tabs}>
        {dictionaryKeys.map((key) => (
          <button
            key={key}
            className={active === key ? styles.activeTab : ''}
            onClick={() => {
              setActive(key);
              setEditing(null);
              setSearch('');
              setError('');
              setNotice('');
            }}
          >
            {dictionaryNames[key]} <span>{data.dictionaries[key].length}</span>
          </button>
        ))}
      </div>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.dictionaryHeading}>
            <h2>{dictionaryNames[active]}</h2>
            <button
              className={`button is-small ${styles.clearDictionaryButton}`}
              disabled={!items.length}
              title={`Clear all entries in ${dictionaryNames[active]}`}
              onClick={() => {
                if (
                  !confirm(
                    `Clear all ${items.length} entries in “${dictionaryNames[active]}”? Other dictionaries will be kept. Linked selections will be cleared.`,
                  )
                )
                  return;
                write([]);
                setEditing(null);
                setSearch('');
                setBulk('');
                setError('');
                setNotice(`${dictionaryNames[active]} cleared.`);
              }}
            >
              Clear tab
            </button>
          </div>
          <input
            aria-label="Search entries"
            className="input is-small"
            placeholder="Search values, labels…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className={styles.tableWrap}>
          <table className="table is-fullwidth is-hoverable">
            <thead>
              <tr>
                <th>Value</th>
                <th>{active === 'buildApps' ? 'Application name' : 'Label'}</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter((item) =>
                  `${item.value} ${item.label ?? ''} ${item.applicationName ?? ''} ${item.description ?? ''}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((item) => (
                  <tr key={item.id}>
                    <td className={styles.mono}>{item.value}</td>
                    <td>
                      {(active === 'buildApps'
                        ? item.applicationName
                        : item.label) || '—'}
                    </td>
                    <td>{item.description || '—'}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className="button is-small"
                          aria-label={`Move ${item.value} up`}
                          disabled={items[0].id === item.id}
                          onClick={() => move(item.id, -1)}
                        >
                          ↑
                        </button>
                        <button
                          className="button is-small"
                          aria-label={`Move ${item.value} down`}
                          disabled={items.at(-1)?.id === item.id}
                          onClick={() => move(item.id, 1)}
                        >
                          ↓
                        </button>
                        <button
                          className="button is-small"
                          onClick={() => {
                            setEditing({ ...item });
                            setError('');
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="button is-small"
                          onClick={() => {
                            if (
                              confirm(
                                `Delete “${item.value}”? Linked selections will be cleared.`,
                              )
                            )
                              write(
                                items.filter((entry) => entry.id !== item.id),
                              );
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!items.length && (
            <p className={styles.empty}>
              This dictionary is empty. Add values below.
            </p>
          )}
        </div>
      </section>
      {editing && (
        <form
          className={styles.panel}
          onSubmit={(event) => {
            event.preventDefault();
            try {
              write(editItem(items, editing.id, editing));
              setEditing(null);
              setError('');
            } catch (caught) {
              setError((caught as Error).message);
            }
          }}
        >
          <div className={styles.panelHeader}>
            <h2>Edit entry</h2>
          </div>
          <div className={styles.formGrid}>
            {(active === 'buildApps'
              ? (['value', 'applicationName', 'label', 'description'] as const)
              : (['value', 'label', 'description'] as const)
            ).map((key) => (
              <label key={key}>
                {key}
                <input
                  className="input is-small"
                  required={key === 'value'}
                  value={editing[key] ?? ''}
                  onChange={(event) =>
                    setEditing({ ...editing, [key]: event.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <div className={styles.actions}>
            <button className="button is-small is-primary">Save entry</button>
            <button
              type="button"
              className="button is-small"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
        </form>
      )}
      <AddEntryForm
        key={active}
        featureBranches={active === 'buildApps'}
        onAdd={(item) => write(addItem(items, item))}
      />
      <form
        className={styles.panel}
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const next =
              active === 'buildApps'
                ? addFeatureBranches(items, bulk)
                : addValues(items, bulk);
            setNotice(
              `${next.length - items.length} entries added. Empty and duplicate values were skipped.`,
            );
            write(next);
            setBulk('');
            setError('');
          } catch (caught) {
            setError((caught as Error).message);
          }
        }}
      >
        <div className={styles.panelHeader}>
          <h2>Bulk add</h2>
          <span className={styles.muted}>
            {active === 'buildApps'
              ? 'value | application_name per line · duplicates skipped'
              : 'One value per line · duplicates skipped'}
          </span>
        </div>
        <textarea
          aria-label="New dictionary values"
          className="textarea is-small"
          rows={4}
          placeholder={
            active === 'buildApps'
              ? 'dashboard | dashboard-ui\ndashboard/account | dashboard-account-page-ui'
              : active === 'queryKeys'
                ? 'tab\nfilter\ndebug'
                : 'One value per line'
          }
          value={bulk}
          onChange={(event) => setBulk(event.target.value)}
        />
        {error && !editing && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.panelFooter}>
          <span role="status" className={styles.muted}>
            {notice || 'Leading and trailing whitespace is removed.'}
          </span>
          <button
            className="button is-small is-primary"
            disabled={!bulk.trim()}
          >
            + Add values
          </button>
        </div>
      </form>
    </>
  );
}
