import { z } from 'zod';
import defaultDictionaries from './default-dictionaries.json';
import {
  buildEnvVariablesSchema,
  defaultBuildEnvVariables,
  buildEnvRowSchema,
  createBuildEnvRow,
} from '../../modules/build-env/types';

export const selectionKeys = [
  'hosts',
  'profiles',
  'versions',
  'routes',
] as const;
export const dictionaryKeys = [
  ...selectionKeys,
  'queryKeys',
  'buildApps',
] as const;
export type SelectionKey = (typeof selectionKeys)[number];
export type DictionaryKey = (typeof dictionaryKeys)[number];
export const dictionaryNames: Record<DictionaryKey, string> = {
  hosts: 'Hosts',
  profiles: 'Profiles',
  versions: 'Versions',
  queryKeys: 'GET parameter keys',
  buildApps: 'Feature branches',
  routes: 'Routes',
};
const itemSchema = z.object({
  id: z.string().min(1),
  value: z.string().trim().min(1),
  label: z.string().optional(),
  description: z.string().optional(),
  applicationName: z.string().optional(),
});
const itemsSchema = z.array(itemSchema).superRefine((items, context) => {
  if (
    new Set(items.map((item) => item.id)).size !== items.length ||
    new Set(items.map((item) => item.value)).size !== items.length
  )
    context.addIssue({
      code: 'custom',
      message: 'Duplicate dictionary IDs or values',
    });
});
const templateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  pattern: z.string().trim().min(1),
});
const selectionSchema = z.object({
  hosts: z.string(),
  profiles: z.string(),
  versions: z.string(),
  routes: z.string(),
});
const queryParamSchema = z.object({
  id: z.string().min(1),
  keyId: z.string(),
  value: z.string(),
});
const rowSchema = z.object({
  id: z.string().min(1),
  templateId: z.string(),
  selections: selectionSchema,
  queryParams: z.array(queryParamSchema).superRefine((params, context) => {
    if (new Set(params.map((param) => param.id)).size !== params.length)
      context.addIssue({ code: 'custom', message: 'Duplicate parameter IDs' });
  }),
});
const dataSchema = z.object({
  schemaVersion: z.literal(4),
  dictionaries: z.object({
    hosts: itemsSchema,
    profiles: itemsSchema,
    versions: itemsSchema,
    queryKeys: itemsSchema,
    buildApps: itemsSchema,
    routes: itemsSchema,
  }),
  templates: z.array(templateSchema),
  presets: z.array(rowSchema.extend({ name: z.string().trim().min(1) })),
  urlBuilderRows: z.array(rowSchema).min(1),
  buildEnvRows: z.array(buildEnvRowSchema).min(1),
  settings: z.object({ theme: z.enum(['light', 'dark', 'system']) }),
});
export const appDataSchema = dataSchema.superRefine((data, context) => {
  for (const list of [
    data.templates,
    data.presets,
    data.urlBuilderRows,
    data.buildEnvRows,
  ]) {
    if (new Set(list.map((item) => item.id)).size !== list.length)
      context.addIssue({ code: 'custom', message: 'Duplicate IDs' });
  }
  for (const row of data.buildEnvRows) {
    if (
      row.appId &&
      !data.dictionaries.buildApps.some((item) => item.id === row.appId)
    )
      context.addIssue({
        code: 'custom',
        message: 'Unknown build app reference',
      });
    if (
      row.versionId &&
      !data.dictionaries.versions.some((item) => item.id === row.versionId)
    )
      context.addIssue({
        code: 'custom',
        message: 'Unknown build version reference',
      });
  }
  for (const row of [...data.presets, ...data.urlBuilderRows]) {
    if (
      row.templateId &&
      !data.templates.some((template) => template.id === row.templateId)
    )
      context.addIssue({
        code: 'custom',
        message: 'Unknown template reference',
      });
    for (const param of row.queryParams) {
      if (
        param.keyId &&
        !data.dictionaries.queryKeys.some((item) => item.id === param.keyId)
      )
        context.addIssue({
          code: 'custom',
          message: 'Unknown GET parameter key reference',
        });
    }
    for (const key of selectionKeys) {
      if (
        row.selections[key] &&
        !data.dictionaries[key].some((item) => item.id === row.selections[key])
      )
        context.addIssue({
          code: 'custom',
          message: `Unknown ${key} reference`,
        });
    }
  }
});
export type AppData = z.infer<typeof appDataSchema>;
export type DictionaryItem = z.infer<typeof itemSchema>;
export type Dictionaries = AppData['dictionaries'];
export type UrlTemplate = z.infer<typeof templateSchema>;
export type UrlBuilderRow = z.infer<typeof rowSchema>;
export type QueryParam = z.infer<typeof queryParamSchema>;
export type UrlPreset = AppData['presets'][number];
export const newId = () => crypto.randomUUID();
export const emptySelections = (): UrlBuilderRow['selections'] => ({
  hosts: '',
  profiles: '',
  versions: '',
  routes: '',
});
export function createRow(templateId = ''): UrlBuilderRow {
  return {
    id: newId(),
    templateId,
    selections: emptySelections(),
    queryParams: [],
  };
}
export function createDefaults(): AppData {
  const dictionaries = dataSchema.shape.dictionaries.parse(defaultDictionaries);
  const template = {
    id: newId(),
    name: 'Corp customer UI',
    pattern:
      '{{host}}/corp-customer-creator-ui/login/dev/{{version}}/{{route}}/?profileId={{profileId}}',
  };
  const row = createRow(template.id);
  for (const key of selectionKeys)
    row.selections[key] = dictionaries[key][0]?.id ?? '';
  return {
    schemaVersion: 4,
    buildEnvRows: [
      createBuildEnvRow(
        dictionaries.buildApps[0]?.id,
        dictionaries.versions[0]?.id,
      ),
    ],
    dictionaries,
    templates: [template],
    presets: [],
    urlBuilderRows: [row],
    settings: { theme: 'system' },
  };
}
const legacyRowSchema = rowSchema
  .omit({ queryParams: true })
  .extend({ selections: selectionSchema.extend({ environments: z.string() }) });
const previousDataSchema = dataSchema.omit({ buildEnvRows: true }).extend({
  schemaVersion: z.literal(3),
  dictionaries: dataSchema.shape.dictionaries.omit({ buildApps: true }),
  buildEnvVariables: buildEnvVariablesSchema,
});
const legacyDataSchema = previousDataSchema
  .omit({ buildEnvVariables: true })
  .extend({
    schemaVersion: z.literal(1),
    dictionaries: previousDataSchema.shape.dictionaries
      .omit({ queryKeys: true })
      .extend({ environments: itemsSchema }),
    urlBuilderRows: z.array(legacyRowSchema).min(1),
    presets: z.array(
      legacyRowSchema.extend({ name: z.string().trim().min(1) }),
    ),
  })
  .superRefine((data, context) => {
    for (const row of [...data.urlBuilderRows, ...data.presets]) {
      if (
        row.selections.environments &&
        !data.dictionaries.environments.some(
          (item) => item.id === row.selections.environments,
        )
      )
        context.addIssue({
          code: 'custom',
          message: 'Unknown environment reference',
        });
    }
  });
export function validateData(value: unknown): AppData {
  if (z.object({ schemaVersion: z.literal(1) }).safeParse(value).success) {
    const legacy = legacyDataSchema.parse(value);
    const migrateRow = (row: z.infer<typeof legacyRowSchema>) => ({
      ...row,
      selections: {
        hosts: row.selections.hosts,
        profiles: row.selections.profiles,
        versions: row.selections.versions,
        routes: row.selections.routes,
      },
      queryParams: [],
    });
    return validateData({
      ...legacy,
      schemaVersion: 3,
      buildEnvVariables: defaultBuildEnvVariables(),
      dictionaries: { ...legacy.dictionaries, queryKeys: [] },
      templates: legacy.templates.map((template) => ({
        ...template,
        pattern: template.pattern
          .replace(/\/\{\{\s*env\s*\}\}/g, '')
          .replace(/\{\{\s*env\s*\}\}\/?/g, ''),
      })),
      urlBuilderRows: legacy.urlBuilderRows.map(migrateRow),
      presets: legacy.presets.map((preset) => ({
        ...preset,
        ...migrateRow(preset),
      })),
    });
  }
  if (z.object({ schemaVersion: z.literal(2) }).safeParse(value).success) {
    const previous = previousDataSchema
      .omit({ buildEnvVariables: true })
      .extend({ schemaVersion: z.literal(2) })
      .parse(value);
    return validateData({
      ...previous,
      schemaVersion: 3,
      buildEnvVariables: defaultBuildEnvVariables(),
    });
  }
  if (z.object({ schemaVersion: z.literal(3) }).safeParse(value).success) {
    const previous = previousDataSchema.parse(value);
    const defaults = createDefaults();
    const context = previous.buildEnvVariables.find(
      (variable) => variable.name.trim() === 'context_root',
    );
    const application = previous.buildEnvVariables.find(
      (variable) => variable.name.trim() === 'application_name',
    );
    const apps = defaults.dictionaries.buildApps.map((item, index) => ({
      ...item,
      id: `build-app-${index}`,
    }));
    const matchedVersion = previous.dictionaries.versions.find((version) =>
      context?.value.startsWith(`/dev/${version.value}/`),
    );
    const matchedApp = apps.find(
      (app) => context?.value === `/dev/${matchedVersion?.value}/${app.value}`,
    );
    return appDataSchema.parse({
      ...previous,
      schemaVersion: 4,
      dictionaries: {
        ...previous.dictionaries,
        buildApps: apps,
      },
      buildEnvRows: [
        {
          ...createBuildEnvRow(),
          id: 'migrated-build-row',
          appId: matchedApp?.id ?? '',
          versionId: matchedVersion?.id ?? '',
          contextRootPattern: matchedApp
            ? '/dev/{{version}}/{{app}}'
            : (context?.value ?? '/dev/{{version}}/{{app}}'),
          applicationNamePattern:
            matchedApp &&
            application?.value ===
              `${matchedApp.applicationName}-${matchedVersion?.value}`
              ? '{{application}}-{{version}}'
              : (application?.value ?? '{{application}}-{{version}}'),
          customVariables: previous.buildEnvVariables.filter(
            (variable) => variable !== context && variable !== application,
          ),
        },
      ],
    });
  }
  const data = appDataSchema.parse(value);
  return {
    ...data,
    templates: data.templates.map((template) =>
      template.name === 'Corp customer UI' &&
      template.pattern ===
        '{{host}}/corp-customer-creator-ui/login/{{version}}/{{route}}/?profileId={{profileId}}'
        ? {
            ...template,
            pattern:
              '{{host}}/corp-customer-creator-ui/login/dev/{{version}}/{{route}}/?profileId={{profileId}}',
          }
        : template,
    ),
  };
}
export function reconcile(data: AppData): AppData {
  const clean = (row: UrlBuilderRow) => ({
    ...row,
    templateId: data.templates.some((item) => item.id === row.templateId)
      ? row.templateId
      : '',
    queryParams: row.queryParams.map((param) => ({
      ...param,
      keyId: data.dictionaries.queryKeys.some((item) => item.id === param.keyId)
        ? param.keyId
        : '',
    })),
    selections: Object.fromEntries(
      selectionKeys.map((key) => [
        key,
        data.dictionaries[key].some((item) => item.id === row.selections[key])
          ? row.selections[key]
          : '',
      ]),
    ) as UrlBuilderRow['selections'],
  });
  return {
    ...data,
    buildEnvRows: data.buildEnvRows.map((row) => ({
      ...row,
      appId: data.dictionaries.buildApps.some((item) => item.id === row.appId)
        ? row.appId
        : '',
      versionId: data.dictionaries.versions.some(
        (item) => item.id === row.versionId,
      )
        ? row.versionId
        : '',
    })),
    urlBuilderRows: data.urlBuilderRows.map(clean),
    presets: data.presets.map((preset) => ({ ...preset, ...clean(preset) })),
  };
}
