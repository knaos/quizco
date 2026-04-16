import path from "path";

export function resolveClientDistPath(
  cwd: string,
  configuredClientDistDir?: string,
): string {
  if (configuredClientDistDir) {
    return path.resolve(configuredClientDistDir);
  }

  return path.resolve(cwd, "apps/client/dist");
}

export function shouldServeClientRoute(requestPath: string): boolean {
  return !(
    requestPath === "/api" ||
    requestPath.startsWith("/api/") ||
    requestPath === "/socket.io" ||
    requestPath.startsWith("/socket.io/")
  );
}
