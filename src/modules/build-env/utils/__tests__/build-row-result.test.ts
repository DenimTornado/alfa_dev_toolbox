import { expect, it } from 'vitest';
import { reconcile } from '../../../../shared/storage/schema';
import { createTestData } from '../../../../shared/storage/__tests__/fixtures';
import { buildRowResult } from '../build-row-result';
it('генерирует базовые ENV из App и Instance', () => {
  const data = createTestData();
  expect(buildRowResult(data, data.buildEnvRows[0]).command).toBe(
    '-e context_root=/dev/v20/dashboard -e application_name=dashboard-ui-v20',
  );
  data.buildEnvRows[0].appId = data.dictionaries.buildApps[1].id;
  data.buildEnvRows[0].versionId = data.dictionaries.versions[1].id;
  expect(buildRowResult(data, data.buildEnvRows[0]).command).toBe(
    '-e context_root=/dev/v21/dashboard/account -e application_name=dashboard-account-page-ui-v21',
  );
});
it('поддерживает редактируемые шаблоны и дополнительные ENV', () => {
  const data = createTestData();
  const row = data.buildEnvRows[0];
  row.contextRootPattern = '/stage/{{app}}/{{version}}';
  row.customVariables = [
    { id: 'env', name: 'FLAGS', value: 'hello & world' },
    { id: 'json', name: 'JSON', value: '{"key":1}' },
  ];
  expect(buildRowResult(data, row).command).toContain(
    '-e context_root=/stage/dashboard/v20',
  );
  expect(buildRowResult(data, row).command).toContain(
    "-e 'FLAGS=hello & world'",
  );
  expect(buildRowResult(data, row).error).toBe('');
});
it('блокирует переопределение базового ENV кастомным', () => {
  const data = createTestData();
  data.buildEnvRows[0].customVariables = [
    { id: 'env', name: 'context_root', value: '/override' },
  ];
  expect(buildRowResult(data, data.buildEnvRows[0]).error).toContain(
    'Duplicate variable',
  );
});
it('сбрасывает удалённый App и требует перевыбор', () => {
  const data = createTestData();
  data.dictionaries.buildApps = [];
  const cleaned = reconcile(data);
  expect(cleaned.buildEnvRows[0].appId).toBe('');
  expect(buildRowResult(cleaned, cleaned.buildEnvRows[0]).error).toContain(
    'Select an app',
  );
});
it('не теряет выбор после редактирования App', () => {
  const data = createTestData();
  data.dictionaries.buildApps[0].value = '/new/path';
  data.dictionaries.buildApps[0].applicationName = 'new-ui';
  expect(buildRowResult(data, data.buildEnvRows[0]).command).toBe(
    '-e context_root=/dev/v20/new/path -e application_name=new-ui-v20',
  );
});
it('сообщает об ошибке неизвестного плейсхолдера', () => {
  const data = createTestData();
  data.buildEnvRows[0].applicationNamePattern = '{{unknown}}';
  expect(buildRowResult(data, data.buildEnvRows[0]).error).toContain(
    'Unknown variable',
  );
});
