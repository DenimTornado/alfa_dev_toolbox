import { useId, useState } from 'react';
import type { DictionaryItem } from '../storage/schema';
import styles from '../../app/app.module.css';
export function SearchSelect({
  items,
  value,
  onChange,
  label,
}: {
  items: DictionaryItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const id = useId();
  const selected = items.find((item) => item.id === value);
  const filtered = items.filter((item) =>
    `${item.value} ${item.label ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div
      className={styles.searchSelect}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setSearch('');
        }
      }}
    >
      <input
        className="input is-small"
        aria-label={label}
        role="combobox"
        aria-expanded={open}
        aria-controls={id}
        aria-autocomplete="list"
        value={open ? search : selected?.label || selected?.value || ''}
        placeholder={`Select ${label}`}
        title={selected?.value}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setSearch(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false);
            setSearch('');
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            document.getElementById(id)?.querySelector('button')?.focus();
          }
          if (event.key === 'Enter' && filtered.length === 1) {
            onChange(filtered[0].id);
            setOpen(false);
            event.currentTarget.blur();
          }
        }}
      />
      {open && (
        <div
          id={id}
          role="listbox"
          aria-label={label}
          className={styles.options}
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => {
              onChange('');
              setOpen(false);
              setSearch('');
            }}
          >
            — Clear selection —
          </button>
          {filtered.map((item) => (
            <button
              type="button"
              role="option"
              aria-selected={value === item.id}
              key={item.id}
              title={item.description}
              onClick={() => {
                onChange(item.id);
                setOpen(false);
                setSearch('');
              }}
            >
              <span>{item.label || item.value}</span>
              {item.label && <small>{item.value}</small>}
            </button>
          ))}
          {!filtered.length && <p>No matching values</p>}
        </div>
      )}
    </div>
  );
}
