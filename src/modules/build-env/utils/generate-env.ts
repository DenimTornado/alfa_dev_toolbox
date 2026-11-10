import type { BuildEnvVariable } from '../types';
export function generateEnv(
  variables: Pick<BuildEnvVariable, 'name' | 'value'>[],
): string {
  if (!variables.length) throw new Error('Add at least one variable.');
  const names = new Set<string>();
  return variables
    .map((variable, index) => {
      const name = variable.name.trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
        throw new Error(
          `Variable ${index + 1}: use a name with letters, digits and underscores, starting with a letter or underscore.`,
        );
      if (names.has(name)) throw new Error(`Duplicate variable name: ${name}`);
      if (variable.value.includes('\0'))
        throw new Error(`Variable ${name}: NUL characters are not supported.`);
      names.add(name);
      const assignment = `${name}=${variable.value}`;
      const escaped = /^[A-Za-z0-9_./:@%+=,-]+$/.test(assignment)
        ? assignment
        : `'${assignment.replace(/'/g, `'"'"'`)}'`;
      return `-e ${escaped}`;
    })
    .join(' ');
}

export function expandBuildPattern(
  pattern: string,
  values: Record<string, string>,
): string {
  const result = pattern.replace(/{{\s*(\w+)\s*}}/g, (_match, key: string) => {
    if (!['app', 'application', 'version'].includes(key))
      throw new Error(`Unknown variable: ${key}`);
    if (!values[key])
      throw new Error(
        `Select ${key === 'version' ? 'an instance' : 'an app'}.`,
      );
    return values[key];
  });
  if (/[{}]/.test(result))
    throw new Error(
      'Invalid build template. Use {{app}}, {{application}} or {{version}}.',
    );
  return result;
}
