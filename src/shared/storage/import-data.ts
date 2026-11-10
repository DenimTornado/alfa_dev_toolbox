import {
  dictionaryKeys,
  selectionKeys,
  newId,
  validateData,
  type AppData,
  type UrlBuilderRow,
} from './schema';
export function importData(
  current: AppData,
  incoming: AppData,
  mode: 'merge' | 'replace',
): AppData {
  const imported = validateData(incoming);
  if (mode === 'replace') return imported;
  const result = structuredClone(current);
  const maps = Object.fromEntries(
    dictionaryKeys.map((key) => [key, new Map<string, string>()]),
  ) as Record<(typeof dictionaryKeys)[number], Map<string, string>>;
  for (const key of dictionaryKeys)
    for (const item of imported.dictionaries[key]) {
      let match = result.dictionaries[key].find(
        (existing) => existing.value === item.value,
      );
      if (!match) {
        match = { ...item, id: newId() };
        result.dictionaries[key].push(match);
      }
      maps[key].set(item.id, match.id);
    }
  const templateMap = new Map<string, string>();
  for (const template of imported.templates) {
    let match = result.templates.find(
      (existing) => existing.pattern === template.pattern,
    );
    if (!match) {
      match = { ...template, id: newId() };
      result.templates.push(match);
    }
    templateMap.set(template.id, match.id);
  }
  const remap = (row: UrlBuilderRow): UrlBuilderRow => ({
    id: newId(),
    templateId: templateMap.get(row.templateId) ?? '',
    queryParams: row.queryParams.map((param) => ({
      ...param,
      id: newId(),
      keyId: maps.queryKeys.get(param.keyId) ?? '',
    })),
    selections: Object.fromEntries(
      selectionKeys.map((key) => [
        key,
        maps[key].get(row.selections[key]) ?? '',
      ]),
    ) as UrlBuilderRow['selections'],
  });
  const signature = (row: UrlBuilderRow) =>
    JSON.stringify([
      row.templateId,
      selectionKeys.map((key) => row.selections[key]),
      row.queryParams.map((param) => [param.keyId, param.value]),
    ]);
  for (const preset of imported.presets) {
    const mapped = { ...remap(preset), name: preset.name };
    if (
      !result.presets.some(
        (existing) =>
          existing.name === mapped.name &&
          signature(existing) === signature(mapped),
      )
    )
      result.presets.push(mapped);
  }
  for (const row of imported.urlBuilderRows) {
    const mapped = remap(row);
    if (
      !result.urlBuilderRows.some(
        (existing) => signature(existing) === signature(mapped),
      )
    )
      result.urlBuilderRows.push(mapped);
  }
  const buildSignature = (row: AppData['buildEnvRows'][number]) =>
    JSON.stringify([
      row.appId,
      row.versionId,
      row.contextRootPattern,
      row.applicationNamePattern,
      row.customVariables.map((variable) => [variable.name, variable.value]),
    ]);
  for (const row of imported.buildEnvRows) {
    const mapped = {
      ...row,
      id: newId(),
      appId: maps.buildApps.get(row.appId) ?? '',
      versionId: maps.versions.get(row.versionId) ?? '',
      customVariables: row.customVariables.map((variable) => ({
        ...variable,
        id: newId(),
      })),
    };
    if (
      !result.buildEnvRows.some(
        (existing) => buildSignature(existing) === buildSignature(mapped),
      )
    )
      result.buildEnvRows.push(mapped);
  }
  return validateData(result);
}
