import { expect, it } from 'vitest';
import {
  addItem,
  addFeatureBranches,
  addValues,
  editItem,
} from '../dictionary-utils';
it('добавляет значения без повторов и пустых строк', () => {
  const items = [{ id: 'stable', value: 'v20' }];
  const result = addValues(items, ' v20 \n\n v21\r\nv21\nv22   ');
  expect(result.map((item) => item.value)).toEqual(['v20', 'v21', 'v22']);
  expect(result[0].id).toBe('stable');
  expect(new Set(result.map((item) => item.id)).size).toBe(3);
});
it('сохраняет стабильный ID при редактировании', () => {
  expect(
    editItem([{ id: 'stable', value: 'old' }], 'stable', {
      value: ' new ',
      label: 'Name',
    }),
  ).toEqual([{ id: 'stable', value: 'new', label: 'Name' }]);
});
it('запрещает повторное или пустое значение при редактировании', () => {
  const items = [
    { id: '1', value: 'old' },
    { id: '2', value: 'new' },
  ];
  expect(() => editItem(items, '1', { value: 'new' })).toThrow(
    'already exists',
  );
  expect(() => editItem(items, '1', { value: ' ' })).toThrow('required');
});

it('добавляет запись со всеми полями Feature branches', () => {
  const result = addItem([], {
    value: ' dashboard/account ',
    applicationName: ' dashboard-account-page-ui ',
    label: 'Account',
    description: 'Nested app',
  });
  expect(result[0]).toMatchObject({
    value: 'dashboard/account',
    applicationName: 'dashboard-account-page-ui',
    label: 'Account',
    description: 'Nested app',
  });
  expect(() => addItem(result, { value: 'dashboard/account' })).toThrow(
    'already exists',
  );
});
it('массово добавляет Feature branches с именами приложений без повторов', () => {
  const result = addFeatureBranches(
    [],
    ' dashboard | dashboard-ui \n dashboard/account | dashboard-account-page-ui\n dashboard | duplicate\n',
  );
  expect(result.map((item) => [item.value, item.applicationName])).toEqual([
    ['dashboard', 'dashboard-ui'],
    ['dashboard/account', 'dashboard-account-page-ui'],
  ]);
});
it('отклоняет неполные пары без частичного массового добавления', () => {
  const original = [
    { id: 'existing', value: 'old', applicationName: 'old-ui' },
  ];
  expect(() => addFeatureBranches(original, 'new | new-ui\nbroken')).toThrow(
    'pair per line',
  );
  expect(original).toHaveLength(1);
});
