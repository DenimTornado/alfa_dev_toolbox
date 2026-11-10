import { createDefaults, dictionaryKeys, selectionKeys } from '../schema';
export function createTestData() {
  const data = createDefaults();
  data.templates[0].name = 'Test template';
  data.templates[0].pattern =
    '{{host}}/creator-ui/login/{{version}}/{{route}}/?profileId={{profileId}}';
  const values = {
    hosts: ['https://dev.example.com', 'https://test.example.com'],
    profiles: ['XCXE1J', 'XCYXRW', 'XD1WXH'],
    versions: ['v20', 'v21'],
    routes: [
      'dashboard',
      'dashboard/account',
      'dashboard/accounts',
      'personal-products',
    ],
    queryKeys: ['tab', 'filter', 'debug'],
    buildApps: ['dashboard', 'dashboard/account'],
  };
  for (const key of dictionaryKeys)
    data.dictionaries[key] = values[key].map((value, index) => ({
      id: `${key}-${index}`,
      value,
    }));
  data.dictionaries.buildApps[0].applicationName = 'dashboard-ui';
  data.dictionaries.buildApps[1].applicationName = 'dashboard-account-page-ui';
  for (const key of selectionKeys)
    data.urlBuilderRows[0].selections[key] = data.dictionaries[key][0].id;
  data.buildEnvRows[0].appId = data.dictionaries.buildApps[0].id;
  data.buildEnvRows[0].versionId = data.dictionaries.versions[0].id;
  return data;
}
