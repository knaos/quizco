function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function resolveApiUrl(
  location: Pick<Location, "hostname" | "origin" | "port" | "protocol">,
  configuredApiUrl?: string,
): string {
  if (configuredApiUrl) {
    return trimTrailingSlash(configuredApiUrl);
  }

  const isSameOriginHost = location.port === "" || location.port === "4000";
  if (isSameOriginHost) {
    return trimTrailingSlash(location.origin);
  }

  return `${location.protocol}//${location.hostname}:4000`;
}
