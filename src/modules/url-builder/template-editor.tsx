import { useState } from 'react';
import { useData } from '../../shared/storage/data-context';
import { newId, type UrlTemplate } from '../../shared/storage/schema';
import { generateUrl } from './utils/generate-url';
import styles from '../../app/app.module.css';
export function TemplateEditor() {
  const { data, update } = useData();
  const [draft, setDraft] = useState<UrlTemplate | null>(null);
  const [error, setError] = useState('');
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>URL templates</h2>
        </div>
        <button
          className="button is-small"
          onClick={() => {
            setDraft({
              id: newId(),
              name: '',
              pattern: '{{host}}/{{route}}?profileId={{profileId}}',
            });
            setError('');
          }}
        >
          + New template
        </button>
      </div>
      {data.templates.map((template) => (
        <div className={styles.templateLine} key={template.id}>
          <div>
            <strong>{template.name}</strong>
            <code>{template.pattern}</code>
          </div>
          <div className={styles.actions}>
            <button
              className="button is-small"
              onClick={() => {
                setDraft({ ...template });
                setError('');
              }}
            >
              Edit
            </button>
            <button
              className="button is-small"
              onClick={() => {
                if (confirm(`Delete template “${template.name}”?`))
                  update((previous) => ({
                    ...previous,
                    templates: previous.templates.filter(
                      (item) => item.id !== template.id,
                    ),
                  }));
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
      {!data.templates.length && (
        <p className={styles.empty}>
          Create a template to start building links.
        </p>
      )}
      {draft && (
        <form
          className={styles.templateForm}
          onSubmit={(event) => {
            event.preventDefault();
            try {
              generateUrl(draft.pattern, {
                host: 'https://example.com',
                profileId: 'sample',
                version: 'v1',
                route: 'dashboard',
              });
              update((previous) => ({
                ...previous,
                templates: previous.templates.some(
                  (item) => item.id === draft.id,
                )
                  ? previous.templates.map((item) =>
                      item.id === draft.id
                        ? {
                            ...draft,
                            name: draft.name.trim(),
                            pattern: draft.pattern.trim(),
                          }
                        : item,
                    )
                  : [
                      ...previous.templates,
                      {
                        ...draft,
                        name: draft.name.trim(),
                        pattern: draft.pattern.trim(),
                      },
                    ],
              }));
              setDraft(null);
              setError('');
            } catch (caught) {
              setError((caught as Error).message);
            }
          }}
        >
          <label>
            Name
            <input
              className="input is-small"
              required
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </label>
          <label>
            Template
            <textarea
              className={`textarea is-small ${styles.mono}`}
              required
              value={draft.pattern}
              onChange={(event) =>
                setDraft({ ...draft, pattern: event.target.value })
              }
            />
          </label>
          <p className={styles.muted}>
            Variables: {'{{host}} · {{profileId}} · {{version}} · {{route}}'}
          </p>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <button className="button is-primary is-small">
              Save template
            </button>
            <button
              type="button"
              className="button is-small"
              onClick={() => setDraft(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
