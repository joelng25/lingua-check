export const DEFAULT_API_URL = "https://api.languagetool.org/v2/check";

export function resolveApiUrl(apiUrl: string): string {
  const trimmed = apiUrl.trim() || DEFAULT_API_URL;

  if (trimmed.endsWith("/check")) {
    return trimmed;
  }

  if (trimmed.endsWith("/v2")) {
    return `${trimmed}/check`;
  }

  return `${trimmed.replace(/\/$/, "")}/v2/check`;
}
