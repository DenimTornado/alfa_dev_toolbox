import { expect, it } from 'vitest';
import { generateEnv } from '../generate-env';
it('генерирует аргументы сборки из примера', () => {
  expect(
    generateEnv([
      { name: 'context_root', value: '/dev/v20/dashboard' },
      { name: 'application_name', value: 'dashboard-ui-v20' },
    ]),
  ).toBe(
    '-e context_root=/dev/v20/dashboard -e application_name=dashboard-ui-v20',
  );
});
it('сохраняет пустое значение и порядок переменных', () => {
  expect(
    generateEnv([
      { name: 'second', value: '' },
      { name: 'first', value: '1' },
    ]),
  ).toBe('-e second= -e first=1');
});
it('экранирует пробелы, подстановки shell и двойные кавычки', () => {
  expect(
    generateEnv([{ name: 'message', value: 'hello $(echo unsafe) "quoted"' }]),
  ).toBe(`-e 'message=hello $(echo unsafe) "quoted"'`);
});
it('экранирует одиночную кавычку внутри значения', () => {
  expect(generateEnv([{ name: 'message', value: "it's ready" }])).toBe(
    `-e 'message=it'"'"'s ready'`,
  );
});
it('не допускает внедрение аргументов через имя', () => {
  expect(() => generateEnv([{ name: '-e other', value: 'value' }])).toThrow(
    'Variable 1',
  );
  expect(() => generateEnv([{ name: '1invalid', value: 'value' }])).toThrow(
    'Variable 1',
  );
});
it('запрещает повторяющиеся имена и пустой список', () => {
  expect(() =>
    generateEnv([
      { name: 'name', value: 'one' },
      { name: 'name', value: 'two' },
    ]),
  ).toThrow('Duplicate variable name');
  expect(() => generateEnv([])).toThrow('Add at least one');
});
it('сохраняет пробелы значения, обрезает пробелы имени и запрещает NUL', () => {
  expect(generateEnv([{ name: ' name ', value: '  exact  ' }])).toBe(
    "-e 'name=  exact  '",
  );
  expect(() =>
    generateEnv([{ name: 'name', value: 'invalid\0value' }]),
  ).toThrow('NUL');
});
