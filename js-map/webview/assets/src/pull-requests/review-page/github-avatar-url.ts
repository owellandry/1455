export function getGitHubAvatarUrl(
  login: string | null | undefined,
  size: number,
): string | null {
  const trimmedLogin = login?.trim();
  if (trimmedLogin == null || trimmedLogin.length === 0) {
    return null;
  }
  if (/\s/.test(trimmedLogin)) {
    return null;
  }

  return `https://avatars.githubusercontent.com/${encodeURIComponent(trimmedLogin)}?size=${size}`;
}
