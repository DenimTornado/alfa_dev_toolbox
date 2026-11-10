import { newId, type DictionaryItem } from '../../shared/storage/schema';
export function addValues(
  items: DictionaryItem[],
  text: string,
): DictionaryItem[] {
  const values = new Set(items.map((item) => item.value));
  const additions: DictionaryItem[] = [];
  for (const line of text.split(/\r?\n/)) {
    const value = line.trim();
    if (value && !values.has(value)) {
      values.add(value);
      additions.push({ id: newId(), value });
    }
  }
  return [...items, ...additions];
}
export function editItem(
  items: DictionaryItem[],
  id: string,
  update: Omit<DictionaryItem, 'id'>,
): DictionaryItem[] {
  const value = update.value.trim();
  if (!value) throw new Error('Value is required.');
  if (items.some((item) => item.id !== id && item.value === value))
    throw new Error('This value already exists.');
  return items.map((item) =>
    item.id === id ? { ...update, value, id } : item,
  );
}

export function addItem(
  items: DictionaryItem[],
  item: Omit<DictionaryItem, 'id'>,
): DictionaryItem[] {
  const value = item.value.trim();
  if (!value) throw new Error('Value is required.');
  if (items.some((existing) => existing.value === value))
    throw new Error('This value already exists.');
  return [
    ...items,
    {
      ...item,
      value,
      applicationName: item.applicationName?.trim(),
      id: newId(),
    },
  ];
}
export function addFeatureBranches(
  items: DictionaryItem[],
  text: string,
): DictionaryItem[] {
  let next = [...items];
  for (const line of text.split(/\r?\n/).filter((line) => line.trim())) {
    const parts = line.split('|').map((part) => part.trim());
    if (parts.length !== 2 || !parts[0] || !parts[1])
      throw new Error('Use one “value | application_name” pair per line.');
    if (!next.some((item) => item.value === parts[0]))
      next = addItem(next, { value: parts[0], applicationName: parts[1] });
  }
  return next;
}
