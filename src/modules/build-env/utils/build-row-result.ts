import type { AppData } from '../../../shared/storage/schema';
import type { BuildEnvRow } from '../types';
import { expandBuildPattern, generateEnv } from './generate-env';
export function buildRowResult(
  data: AppData,
  row: BuildEnvRow,
): { command: string; error: string } {
  try {
    const app = data.dictionaries.buildApps.find(
      (item) => item.id === row.appId,
    );
    const values = {
      app: app?.value.replace(/^\/+|\/+$/g, '') ?? '',
      application:
        app?.applicationName?.trim() ||
        (app
          ? `${app.value.replace(/^\/+|\/+$/g, '').replaceAll('/', '-')}-ui`
          : ''),
      version:
        data.dictionaries.versions.find((item) => item.id === row.versionId)
          ?.value ?? '',
    };
    const context = expandBuildPattern(row.contextRootPattern, values);
    const application = expandBuildPattern(row.applicationNamePattern, values);
    if (!context.trim() || !application.trim())
      throw new Error('Both base variables require values.');
    return {
      command: generateEnv([
        { name: 'context_root', value: context },
        { name: 'application_name', value: application },
        ...row.customVariables,
      ]),
      error: '',
    };
  } catch (error) {
    return {
      command: '',
      error:
        error instanceof Error ? error.message : 'Invalid build arguments.',
    };
  }
}
