import { afterEach, beforeEach, vi } from "vitest";
import i18n from "../i18n";

Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  value: true,
  writable: true,
});

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});
