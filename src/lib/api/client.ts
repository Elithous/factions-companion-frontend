/**
 * Thin fetch wrapper for the backend. Everything goes through the `/api`
 * rewrite configured in next.config.ts.
 */

export type QueryParams = Record<string, string | number | undefined>;

export function getApiUrl(endpoint: string) {
  return `/api/${endpoint.replace(/^\//, '')}`;
}

function buildUrl(endpoint: string, queryParams?: QueryParams) {
  const url = getApiUrl(endpoint);
  if (!queryParams) return url;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `${url}?${query}` : url;
}

export function fetchBackend(endpoint: string, queryParams?: QueryParams, options?: RequestInit) {
  return fetch(buildUrl(endpoint, queryParams), options);
}

/** `fetchBackend` + JSON parse + a useful error message on non-2xx. */
export async function fetchJson<T>(
  endpoint: string,
  queryParams?: QueryParams,
  options?: RequestInit,
): Promise<T> {
  const response = await fetchBackend(endpoint, queryParams, options);

  if (!response.ok) {
    throw new Error(`Request to ${endpoint} failed with status ${response.status}`);
  }

  const data = await response.json();
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }

  return data as T;
}
