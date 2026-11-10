import { z } from 'zod';
export const buildEnvVariableSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  value: z.string(),
});
export const buildEnvVariablesSchema = z
  .array(buildEnvVariableSchema)
  .superRefine((variables, context) => {
    if (
      new Set(variables.map((variable) => variable.id)).size !==
      variables.length
    )
      context.addIssue({
        code: 'custom',
        message: 'Duplicate build variable IDs',
      });
  });
export const buildEnvRowSchema = z.object({
  id: z.string().min(1),
  appId: z.string(),
  versionId: z.string(),
  contextRootPattern: z.string(),
  applicationNamePattern: z.string(),
  customVariables: buildEnvVariablesSchema,
});
export type BuildEnvVariable = z.infer<typeof buildEnvVariableSchema>;
export type BuildEnvRow = z.infer<typeof buildEnvRowSchema>;
export function createBuildEnvRow(appId = '', versionId = ''): BuildEnvRow {
  return {
    id: crypto.randomUUID(),
    appId,
    versionId,
    contextRootPattern: '/dev/{{version}}/{{app}}',
    applicationNamePattern: '{{application}}-{{version}}',
    customVariables: [],
  };
}
export function defaultBuildEnvVariables(): BuildEnvVariable[] {
  return [
    {
      id: 'build-context-root',
      name: 'context_root',
      value: '/dev/v20/dashboard',
    },
    {
      id: 'build-application-name',
      name: 'application_name',
      value: 'dashboard-ui-v20',
    },
  ];
}
