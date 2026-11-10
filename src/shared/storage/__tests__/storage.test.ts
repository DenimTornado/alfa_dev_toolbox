import { expect, it } from 'vitest';
import { createDefaults, validateData, reconcile } from '../schema';
import defaultDictionaries from '../default-dictionaries.json';
import { createTestData } from './fixtures';
import { importData } from '../import-data';
import { loadData, saveData } from '../storage';
import { rowResult } from '../../../modules/url-builder/utils/generate-url';
it('валидирует полный JSON и запрещает неподдерживаемую версию', () => {
  const data = createTestData();
  expect(validateData(JSON.parse(JSON.stringify(data)))).toEqual(data);
  expect(() => validateData({ ...data, schemaVersion: 99 })).toThrow();
  expect(() => validateData({})).toThrow();
});
it('отклоняет дубли ID и значений, неверную тему и висячие ссылки', () => {
  const duplicate = createTestData();
  duplicate.dictionaries.profiles.push({
    ...duplicate.dictionaries.profiles[0],
  });
  expect(() => validateData(duplicate)).toThrow();
  const dangling = createTestData();
  dangling.urlBuilderRows[0].templateId = 'missing';
  expect(() => validateData(dangling)).toThrow();
  const wrongSelection = createTestData();
  wrongSelection.urlBuilderRows[0].selections.profiles = 'missing';
  expect(() => validateData(wrongSelection)).toThrow();
  expect(() =>
    validateData({ ...createTestData(), settings: { theme: 'unknown' } }),
  ).toThrow();
});
it('Merge дедуплицирует данные и переназначает ссылки пресетов', () => {
  const current = createTestData();
  const incoming = createTestData();
  incoming.dictionaries.profiles[0].value = 'NEW PROFILE';
  incoming.presets.push({
    ...incoming.urlBuilderRows[0],
    id: 'preset-1',
    name: 'Imported',
  });
  const result = importData(current, incoming, 'merge');
  expect(result.dictionaries.hosts).toHaveLength(2);
  expect(result.dictionaries.profiles).toHaveLength(4);
  expect(result.templates).toHaveLength(1);
  expect(result.presets[0].templateId).toBe(current.templates[0].id);
  expect(rowResult(result, result.presets[0]).url).toContain(
    'profileId=NEW%20PROFILE',
  );
  expect(validateData(result)).toEqual(result);
  const again = importData(result, incoming, 'merge');
  expect(again.presets).toHaveLength(1);
  expect(again.urlBuilderRows).toHaveLength(2);
});
it('Merge справляется с коллизиями ID у разных значений', () => {
  const current = createTestData();
  const incoming = structuredClone(current);
  incoming.dictionaries.hosts[0].value = 'https://other.example.com';
  incoming.templates[0].pattern = '{{host}}/?p={{profileId}}';
  const result = importData(current, incoming, 'merge');
  expect(result.templates).toHaveLength(2);
  expect(result.dictionaries.hosts).toHaveLength(3);
  expect(rowResult(result, result.urlBuilderRows[1]).url).toBe(
    'https://other.example.com/?p=XCXE1J',
  );
});
it('Replace полностью заменяет состояние', () => {
  const current = createTestData();
  const incoming = createTestData();
  incoming.settings.theme = 'dark';
  expect(importData(current, incoming, 'replace')).toEqual(incoming);
});
it('не перезаписывает повреждённые данные хранилища', () => {
  let original = '{broken json';
  const storage = {
    getItem: () => original,
    setItem: (_key: string, value: string) => {
      original = value;
    },
  };
  const result = loadData(storage);
  expect(result.blocked).toBe(true);
  expect(result.error).toContain('not been overwritten');
  expect(original).toBe('{broken json');
});
it('обрабатывает запрет чтения и записи', () => {
  const storage = {
    getItem: (): string | null => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
  expect(loadData(storage).blocked).toBe(true);
  expect(saveData(storage, createTestData())).toContain('Unable to save');
});
it('сохраняет и восстанавливает состояние', () => {
  let raw: string | null = null;
  const storage = {
    getItem: () => raw,
    setItem: (_key: string, value: string) => {
      raw = value;
    },
  };
  const data = createTestData();
  expect(saveData(storage, data)).toBe('');
  expect(loadData(storage).data).toEqual(data);
  expect(loadData({ ...storage, getItem: () => null }).blocked).toBe(false);
});

it('Merge переназначает GET-ключи, сохраняет повторения и учитывает значения при дедупликации', () => {
  const current = createTestData();
  const incoming = createTestData();
  const keyId = incoming.dictionaries.queryKeys[0].id;
  incoming.urlBuilderRows[0].queryParams = [
    { id: 'p1', keyId, value: 'first' },
    { id: 'p2', keyId, value: 'second' },
  ];
  incoming.presets = [
    {
      ...structuredClone(incoming.urlBuilderRows[0]),
      id: 'preset',
      name: 'Query preset',
    },
  ];
  const result = importData(current, incoming, 'merge');
  expect(result.dictionaries.queryKeys).toHaveLength(3);
  expect(result.urlBuilderRows).toHaveLength(2);
  expect(
    result.urlBuilderRows[1].queryParams.map((param) => param.keyId),
  ).toEqual([
    current.dictionaries.queryKeys[0].id,
    current.dictionaries.queryKeys[0].id,
  ]);
  expect(
    new URL(rowResult(result, result.presets[0]).url).searchParams.getAll(
      'tab',
    ),
  ).toEqual(['first', 'second']);
  const again = importData(result, incoming, 'merge');
  expect(again.urlBuilderRows).toHaveLength(2);
  expect(again.presets).toHaveLength(1);
  incoming.urlBuilderRows[0].queryParams[0].value = 'changed';
  expect(importData(result, incoming, 'merge').urlBuilderRows).toHaveLength(3);
});
it('отклоняет висячую ссылку GET-ключа и дубли ID параметров', () => {
  const data = createTestData();
  data.urlBuilderRows[0].queryParams = [
    { id: 'param', keyId: 'missing', value: 'value' },
  ];
  expect(() => validateData(data)).toThrow();
  data.urlBuilderRows[0].queryParams = [
    { id: 'param', keyId: '', value: '' },
    { id: 'param', keyId: '', value: '' },
  ];
  expect(() => validateData(data)).toThrow();
});
it('мигрирует v1 из localStorage и JSON без потери строк, пресетов и стабильных ID', () => {
  const current = createTestData();
  const legacyRow = {
    id: 'row',
    templateId: current.templates[0].id,
    selections: {
      ...current.urlBuilderRows[0].selections,
      environments: 'env',
    },
  };
  const legacy = {
    ...current,
    schemaVersion: 1,
    dictionaries: {
      hosts: current.dictionaries.hosts,
      profiles: current.dictionaries.profiles,
      versions: current.dictionaries.versions,
      routes: current.dictionaries.routes,
      environments: [{ id: 'env', value: 'dev' }],
    },
    templates: [
      {
        ...current.templates[0],
        pattern:
          '{{host}}/login/{{env}}/{{version}}/{{route}}/?profileId={{profileId}}',
      },
    ],
    urlBuilderRows: [legacyRow],
    presets: [{ ...legacyRow, id: 'preset', name: 'Existing' }],
  };
  const migrated = validateData(legacy);
  expect(migrated.schemaVersion).toBe(4);
  expect(migrated.dictionaries).not.toHaveProperty('environments');
  expect(migrated.urlBuilderRows[0].selections).toEqual(
    current.urlBuilderRows[0].selections,
  );
  expect(migrated.urlBuilderRows[0].queryParams).toEqual([]);
  expect(migrated.presets[0].name).toBe('Existing');
  expect(migrated.templates[0].id).toBe(current.templates[0].id);
  expect(rowResult(migrated, migrated.urlBuilderRows[0]).url).toBe(
    'https://dev.example.com/login/v20/dashboard/?profileId=XCXE1J',
  );
  const loaded = loadData({
    getItem: () => JSON.stringify(legacy),
    setItem: () => {
      throw new Error('must not write');
    },
  });
  expect(loaded.blocked).toBe(false);
  expect(loaded.data).toEqual(migrated);
});
it('сохраняет повторяющиеся GET-параметры при Replace и восстановлении JSON', () => {
  const data = createTestData();
  const keyId = data.dictionaries.queryKeys[0].id;
  data.urlBuilderRows[0].queryParams = [
    { id: 'first', keyId, value: 'one' },
    { id: 'second', keyId, value: 'two' },
  ];
  const restored = validateData(JSON.parse(JSON.stringify(data)));
  expect(
    importData(createTestData(), restored, 'replace').urlBuilderRows[0]
      .queryParams,
  ).toEqual(data.urlBuilderRows[0].queryParams);
});

it('мигрирует v3 без потери базовых значений и кастомных ENV', () => {
  const data = createTestData();
  const legacy = {
    ...data,
    schemaVersion: 3,
    buildEnvVariables: [
      { id: 'context', name: 'context_root', value: '/custom/root' },
      { id: 'application', name: 'application_name', value: 'custom-name' },
      { id: 'custom', name: 'DEBUG', value: '1' },
    ],
  };
  const result = validateData(legacy);
  expect(result.schemaVersion).toBe(4);
  expect(result.buildEnvRows[0].contextRootPattern).toBe('/custom/root');
  expect(result.buildEnvRows[0].applicationNamePattern).toBe('custom-name');
  expect(result.buildEnvRows[0].customVariables).toEqual([
    { id: 'custom', name: 'DEBUG', value: '1' },
  ]);
});
it('Merge переназначает App и Instance, сохраняет строки с кастомными ENV', () => {
  const current = createTestData();
  const incoming = createTestData();
  incoming.buildEnvRows[0].customVariables = [
    { id: 'env', name: 'DEBUG', value: '1' },
  ];
  const merged = importData(current, incoming, 'merge');
  expect(merged.buildEnvRows).toHaveLength(2);
  expect(merged.buildEnvRows[1].appId).toBe(
    current.dictionaries.buildApps[0].id,
  );
  expect(merged.buildEnvRows[1].versionId).toBe(
    current.dictionaries.versions[0].id,
  );
  expect(merged.buildEnvRows[1].customVariables[0].value).toBe('1');
  expect(importData(merged, incoming, 'merge').buildEnvRows).toHaveLength(2);
  expect(importData(current, incoming, 'replace').buildEnvRows).toEqual(
    incoming.buildEnvRows,
  );
});
it('отклоняет повреждённые Build ENV и висячие ссылки', () => {
  const data = createTestData();
  data.buildEnvRows[0].appId = 'missing';
  expect(() => validateData(data)).toThrow();
  const other = createTestData();
  other.buildEnvRows[0].customVariables = [
    { id: 'same', name: 'DEBUG', value: '1' },
    { id: 'same', name: 'OTHER', value: '2' },
  ];
  expect(() => validateData(other)).toThrow();
});

it('использует пустые справочники и единственный шаблон для новых данных и сброса', () => {
  const data = createDefaults();
  expect(data.dictionaries).toEqual(defaultDictionaries);
  expect(validateData(data)).toEqual(data);
  expect(
    loadData({
      getItem: () => null,
      setItem: () => {
        throw new Error('must not write');
      },
    }).data.dictionaries,
  ).toEqual(defaultDictionaries);
});
it('изменение рабочего состояния не меняет дефолтные справочники', () => {
  const data = createDefaults();
  data.dictionaries.hosts.push({ id: 'custom', value: 'modified.example.com' });
  expect(createDefaults().dictionaries).toEqual(defaultDictionaries);
});
it('сохранённые справочники пользователя имеют приоритет перед новыми дефолтами', () => {
  const data = createTestData();
  data.dictionaries.hosts[0].value = 'https://custom.example.com';
  expect(
    loadData({
      getItem: () => JSON.stringify(data),
      setItem: () => {
        throw new Error('must not write');
      },
    }).data,
  ).toEqual(data);
});

it('очищает только выбранный справочник и сбрасывает связанные выборы', () => {
  const data = createTestData();
  data.presets = [
    { ...structuredClone(data.urlBuilderRows[0]), id: 'preset', name: 'Saved' },
  ];
  const result = reconcile({
    ...data,
    dictionaries: { ...data.dictionaries, versions: [] },
  });
  expect(result.dictionaries).toEqual({ ...data.dictionaries, versions: [] });
  expect(result.urlBuilderRows[0].selections).toEqual({
    ...data.urlBuilderRows[0].selections,
    versions: '',
  });
  expect(result.presets[0].selections.versions).toBe('');
  expect(result.buildEnvRows[0]).toEqual({
    ...data.buildEnvRows[0],
    versionId: '',
  });
  expect(result.templates).toEqual(data.templates);
  expect(result.settings).toEqual(data.settings);
  expect(validateData(result)).toEqual(result);
});

it('начинает с единственного Corp customer UI без пользовательских значений', () => {
  const data = createDefaults();
  expect(Object.values(data.dictionaries).flat()).toEqual([]);
  expect(
    data.templates.map((template) => ({
      name: template.name,
      pattern: template.pattern,
    })),
  ).toEqual([
    {
      name: 'Corp customer UI',
      pattern:
        '{{host}}/corp-customer-creator-ui/login/dev/{{version}}/{{route}}/?profileId={{profileId}}',
    },
  ]);
  expect(
    Object.values(data.urlBuilderRows[0].selections).every(
      (value) => value === '',
    ),
  ).toBe(true);
  expect(data.presets).toEqual([]);
  expect(data.buildEnvRows[0].appId).toBe('');
  expect(data.buildEnvRows[0].versionId).toBe('');
});

it('обновляет прежний базовый шаблон с сохранением ID и пользовательских шаблонов', () => {
  const data = createDefaults();
  data.templates[0].pattern =
    '{{host}}/corp-customer-creator-ui/login/{{version}}/{{route}}/?profileId={{profileId}}';
  data.templates.push({
    id: 'custom',
    name: 'Custom',
    pattern: '{{host}}/custom/{{route}}',
  });
  const updated = validateData(data);
  expect(updated.templates[0].id).toBe(data.templates[0].id);
  expect(updated.templates[0].pattern).toBe(
    '{{host}}/corp-customer-creator-ui/login/dev/{{version}}/{{route}}/?profileId={{profileId}}',
  );
  expect(updated.templates[1]).toEqual(data.templates[1]);
});
