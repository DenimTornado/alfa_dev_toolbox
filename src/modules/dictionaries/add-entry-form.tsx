import { useState } from 'react';
import type { DictionaryItem } from '../../shared/storage/schema';
import styles from '../../app/app.module.css';
export function AddEntryForm({
  featureBranches,
  onAdd,
}: {
  featureBranches: boolean;
  onAdd: (item: Omit<DictionaryItem, 'id'>) => void;
}) {
  const [draft, setDraft] = useState({
    value: '',
    applicationName: '',
    label: '',
    description: '',
  });
  const [error, setError] = useState('');
  return (
    <form
      className={styles.panel}
      onSubmit={(event) => {
        event.preventDefault();
        try {
          if (featureBranches && !draft.applicationName.trim())
            throw new Error('Application name is required.');
          onAdd(draft);
          setDraft({
            value: '',
            applicationName: '',
            label: '',
            description: '',
          });
          setError('');
        } catch (caught) {
          setError((caught as Error).message);
        }
      }}
    >
      <div className={styles.panelHeader}>
        <h2>Add entry</h2>
      </div>
      <div className={styles.formGrid}>
        {(featureBranches
          ? (['value', 'applicationName', 'label', 'description'] as const)
          : (['value', 'label', 'description'] as const)
        ).map((key) => (
          <label key={key}>
            {key === 'applicationName'
              ? 'Application name'
              : key === 'value'
                ? 'Value'
                : key === 'label'
                  ? 'Label'
                  : 'Description'}
            <input
              className="input is-small"
              aria-label={`New entry ${key}`}
              required={key === 'value' || key === 'applicationName'}
              value={draft[key]}
              onChange={(event) =>
                setDraft({ ...draft, [key]: event.target.value })
              }
            />
          </label>
        ))}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button className="button is-small is-primary">+ Add entry</button>
    </form>
  );
}
