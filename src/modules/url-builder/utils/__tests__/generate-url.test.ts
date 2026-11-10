import { expect, it } from 'vitest';
import { generateUrl, rowResult } from '../generate-url';
import { reconcile } from '../../../../shared/storage/schema';
import { createTestData } from '../../../../shared/storage/__tests__/fixtures';
it('генерирует URL демонстрационного шаблона', () => {
  const data = createTestData();
  expect(rowResult(data, data.urlBuilderRows[0]).url).toBe(
    'https://dev.example.com/creator-ui/login/v20/dashboard/?profileId=XCXE1J',
  );
});
it('требует только используемые плейсхолдеры', () => {
  expect(generateUrl('{{host}}/health', { host: 'https://example.com' })).toBe(
    'https://example.com/health',
  );
  expect(() =>
    generateUrl('{{host}}/{{route}}', { host: 'https://example.com' }),
  ).toThrow('Select route');
});
it('нормализует крайние слеши и сохраняет слеши внутри маршрута', () => {
  expect(
    generateUrl('{{host}}/{{route}}/', {
      host: 'https://example.com/',
      route: '/dashboard//accounts/',
    }),
  ).toBe('https://example.com/dashboard//accounts/');
});
it('кодирует параметры без внедрения новых query-параметров', () => {
  expect(
    generateUrl('{{host}}/{{route}}?profile={{profileId}}', {
      host: 'https://example.com',
      route: 'a b/счёт',
      profileId: 'a&admin=true +#/?',
    }),
  ).toBe(
    'https://example.com/a%20b/%D1%81%D1%87%D1%91%D1%82?profile=a%26admin%3Dtrue%20%2B%23%2F%3F',
  );
});
it('кодирует маршрут в query как одно значение', () => {
  expect(
    generateUrl('{{host}}/?next={{route}}', {
      host: 'https://example.com',
      route: 'dashboard/account',
    }),
  ).toBe('https://example.com/?next=dashboard%2Faccount');
});
it('отклоняет неизвестный плейсхолдер', () => {
  expect(() => generateUrl('https://example.com/{{unknown}}', {})).toThrow(
    'Unknown placeholder',
  );
});
it('отклоняет незакрытый плейсхолдер', () => {
  expect(() => generateUrl('https://example.com/{{route}', {})).toThrow(
    'Invalid placeholder',
  );
});
it('отклоняет небезопасную схему и относительный URL', () => {
  expect(() => generateUrl('javascript:alert(1)', {})).toThrow('Only HTTP');
  expect(() => generateUrl('/relative/path', {})).toThrow('absolute URL');
});
it('отклоняет подмену host и встроенные credentials', () => {
  expect(() =>
    generateUrl('{{host}}/path', { host: 'https://example.com/?next=' }),
  ).toThrow('Host must');
  expect(() => generateUrl('https://user:secret@example.com', {})).toThrow(
    'credentials',
  );
});
it('не допускает обход маршрута через dot segments', () => {
  expect(() =>
    generateUrl('{{host}}/{{route}}', {
      host: 'https://example.com',
      route: '../admin',
    }),
  ).toThrow('dot segments');
});
it('сбрасывает удалённый выбор и сообщает об обязательном параметре', () => {
  const data = createTestData();
  const selected = data.urlBuilderRows[0].selections.profiles;
  data.dictionaries.profiles = data.dictionaries.profiles.filter(
    (item) => item.id !== selected,
  );
  const cleaned = reconcile(data);
  expect(cleaned.urlBuilderRows[0].selections.profiles).toBe('');
  expect(rowResult(cleaned, cleaned.urlBuilderRows[0]).error).toContain(
    'Select profileId',
  );
});

it('подставляет HTTPS для хоста без протокола', () => {
  expect(
    generateUrl('{{host}}/{{route}}', {
      host: ' dev.example.com/ ',
      route: 'dashboard',
    }),
  ).toBe('https://dev.example.com/dashboard');
});
it('сохраняет явно указанный HTTP и поддерживает порт без протокола', () => {
  expect(generateUrl('{{host}}/', { host: 'http://localhost:8080' })).toBe(
    'http://localhost:8080/',
  );
  expect(generateUrl('{{host}}/', { host: 'localhost:8080/' })).toBe(
    'https://localhost:8080/',
  );
  expect(generateUrl('{{host}}/', { host: 'dev.example.com:8443' })).toBe(
    'https://dev.example.com:8443/',
  );
});
it('не подменяет небезопасный протокол на HTTPS', () => {
  expect(() =>
    generateUrl('{{host}}/', { host: 'javascript:alert(1)' }),
  ).toThrow('Host must');
  expect(() => generateUrl('{{host}}/', { host: 'ftp://example.com' })).toThrow(
    'Host must',
  );
});
it('добавляет повторяющиеся GET-ключи после параметров шаблона и перед fragment', () => {
  const result = generateUrl(
    '{{host}}/?profile={{profileId}}#section',
    { host: 'example.com', profileId: 'a b' },
    [
      { key: 'filter', value: 'one' },
      { key: 'filter', value: 'two' },
    ],
  );
  expect(result).toBe(
    'https://example.com/?profile=a%20b&filter=one&filter=two#section',
  );
  expect(new URL(result).searchParams.getAll('filter')).toEqual(['one', 'two']);
});
it('кодирует ключи и ручные значения, сохраняя пустые значения и пробелы', () => {
  const result = generateUrl('https://example.com/path', {}, [
    { key: 'a&b', value: ' x&y=+#/привет ' },
    { key: 'empty', value: '' },
  ]);
  const params = new URL(result).searchParams;
  expect(params.get('a&b')).toBe(' x&y=+#/привет ');
  expect(params.get('empty')).toBe('');
  expect(params.has('y')).toBe(false);
});
it('добавляет GET-параметр к шаблону с пустым query или завершающим амперсандом', () => {
  expect(
    generateUrl('https://example.com/?', {}, [{ key: 'debug', value: '1' }]),
  ).toBe('https://example.com/?debug=1');
  expect(
    generateUrl('https://example.com/?a=1&', {}, [
      { key: 'debug', value: '1' },
    ]),
  ).toBe('https://example.com/?a=1&debug=1');
});
it('требует выбрать ключ для добавленного GET-параметра', () => {
  expect(() =>
    generateUrl('https://example.com/', {}, [{ key: '', value: 'value' }]),
  ).toThrow('Select a key');
});
it('сохраняет ручное значение и сбрасывает удалённый GET-ключ', () => {
  const data = createTestData();
  const row = data.urlBuilderRows[0];
  row.queryParams = [
    { id: 'param', keyId: data.dictionaries.queryKeys[0].id, value: 'manual' },
  ];
  data.dictionaries.queryKeys = [];
  const result = reconcile(data);
  expect(result.urlBuilderRows[0].queryParams).toEqual([
    { id: 'param', keyId: '', value: 'manual' },
  ]);
  expect(rowResult(result, result.urlBuilderRows[0]).error).toContain(
    'Select a key',
  );
});
it('сохраняет выбор GET-ключа при его редактировании', () => {
  const data = createTestData();
  const row = data.urlBuilderRows[0];
  row.queryParams = [
    { id: 'param', keyId: data.dictionaries.queryKeys[0].id, value: 'manual' },
  ];
  data.dictionaries.queryKeys[0].value = 'renamed';
  expect(rowResult(data, row).url).toContain('&renamed=manual');
});
it('не поддерживает удалённую переменную Environment', () => {
  expect(() =>
    generateUrl('https://example.com/{{env}}', { env: 'dev' }),
  ).toThrow('Unknown placeholder');
});
