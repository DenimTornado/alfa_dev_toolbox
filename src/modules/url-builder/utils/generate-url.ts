import {
  type AppData,
  type SelectionKey,
  type UrlBuilderRow,
} from '../../../shared/storage/schema';
export const variables: Record<string, SelectionKey> = {
  host: 'hosts',
  profileId: 'profiles',
  version: 'versions',
  route: 'routes',
};
export function normalizeHost(value: string): string {
  const trimmed = value.trim();
  let host = trimmed;
  if (!/^https?:\/\//i.test(host)) {
    const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(host);
    const hasPort = /^[^/?#:]+:\d+\/*$/.test(host);
    if (hasScheme && !hasPort) throw new Error('Host must use HTTP or HTTPS.');
    host = `https://${host.replace(/^\/\//, '')}`;
  }
  if (!/^https?:\/\/[^/?#\s]+\/*$/i.test(host))
    throw new Error(
      'Host must be an HTTP/HTTPS origin (HTTPS is used by default).',
    );
  let parsed: URL;
  try {
    parsed = new URL(host);
  } catch {
    throw new Error('Host is invalid.');
  }
  if (parsed.username || parsed.password)
    throw new Error('URLs with embedded credentials are not allowed.');
  return parsed.origin;
}
export function generateUrl(
  pattern: string,
  values: Record<string, string>,
  queryParams: { key: string; value: string }[] = [],
): string {
  if (!pattern.trim()) throw new Error('Choose a URL template.');
  const tokens = [...pattern.matchAll(/{{\s*([a-zA-Z][\w]*)\s*}}/g)];
  if (pattern.replace(/{{\s*([a-zA-Z][\w]*)\s*}}/g, '').match(/[{}]/))
    throw new Error('Invalid placeholder. Use {{variable}}.');
  for (const token of tokens) {
    if (!(token[1] in variables))
      throw new Error(`Unknown placeholder: ${token[1]}`);
    if (!values[token[1]]?.trim())
      throw new Error(`Select ${token[1]} to generate this URL.`);
  }
  const queryIndex = pattern.indexOf('?');
  const hashIndex = pattern.indexOf('#');
  const result = pattern.replace(
    /{{\s*([a-zA-Z][\w]*)\s*}}/g,
    (match, key: string, offset: number) => {
      const value = values[key].trim();
      if (key === 'host') {
        if (offset !== 0)
          throw new Error('Host must be at the start of the template.');
        return normalizeHost(value);
      }
      const inQuery =
        queryIndex !== -1 &&
        offset > queryIndex &&
        (hashIndex === -1 || offset < hashIndex);
      if (inQuery || (hashIndex !== -1 && offset > hashIndex))
        return encodeURIComponent(value);
      if (key === 'route') {
        const route = value.replace(/^\/+|\/+$/g, '');
        if (
          route
            .split('/')
            .some((segment) => segment === '.' || segment === '..')
        )
          throw new Error('Route cannot contain dot segments.');
        return route
          .split('/')
          .map((segment) => encodeURIComponent(segment))
          .join('/');
      }
      void match;
      return encodeURIComponent(value);
    },
  );
  let url: URL;
  try {
    url = new URL(result);
  } catch {
    throw new Error('Template does not produce an absolute URL.');
  }
  if (!['https:', 'http:'].includes(url.protocol))
    throw new Error('Only HTTP and HTTPS URLs are allowed.');
  if (url.username || url.password)
    throw new Error('URLs with embedded credentials are not allowed.');
  for (const param of queryParams) {
    if (!param.key.trim())
      throw new Error(
        'Select a key for every GET parameter or remove the unused parameter.',
      );
  }
  if (queryParams.length) {
    const hashOffset = url.href.indexOf('#');
    const base = hashOffset === -1 ? url.href : url.href.slice(0, hashOffset);
    const hash = hashOffset === -1 ? '' : url.href.slice(hashOffset);
    const separator = base.includes('?')
      ? base.endsWith('?') || base.endsWith('&')
        ? ''
        : '&'
      : '?';
    return `${base}${separator}${queryParams.map((param) => `${encodeURIComponent(param.key.trim())}=${encodeURIComponent(param.value)}`).join('&')}${hash}`;
  }
  return url.href;
}
export function rowResult(
  data: AppData,
  row: UrlBuilderRow,
): { url: string; error: string } {
  try {
    const pattern =
      data.templates.find((template) => template.id === row.templateId)
        ?.pattern ?? '';
    const values = Object.fromEntries(
      Object.entries(variables).map(([variable, key]) => [
        variable,
        data.dictionaries[key].find((item) => item.id === row.selections[key])
          ?.value ?? '',
      ]),
    );
    const params = row.queryParams.map((param) => ({
      key:
        data.dictionaries.queryKeys.find((item) => item.id === param.keyId)
          ?.value ?? '',
      value: param.value,
    }));
    return { url: generateUrl(pattern, values, params), error: '' };
  } catch (error) {
    return {
      url: '',
      error: error instanceof Error ? error.message : 'Invalid URL.',
    };
  }
}
