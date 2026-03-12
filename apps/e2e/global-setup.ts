import type { FullConfig } from "@playwright/test";

async function globalSetup(_config: FullConfig): Promise<void> {
  // Reserved for future db/session setup for full-stack e2e flows.
}

export default globalSetup;
