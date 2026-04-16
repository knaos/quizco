import { describe, expect, it } from "vitest";
import { resolveApiUrl } from "./network";

describe("resolveApiUrl", () => {
  it("uses the configured API URL when provided", () => {
    expect(
      resolveApiUrl(
        {
          hostname: "quizco.local",
          origin: "http://quizco.local",
          port: "",
          protocol: "http:",
        },
        "https://quiz.example.com/",
      ),
    ).toBe("https://quiz.example.com");
  });

  it("uses same-origin when the app is already served by the backend host", () => {
    expect(
      resolveApiUrl({
        hostname: "quizco.local",
        origin: "http://quizco.local",
        port: "",
        protocol: "http:",
      }),
    ).toBe("http://quizco.local");
  });

  it("falls back to port 4000 for Vite dev and split-host setups", () => {
    expect(
      resolveApiUrl({
        hostname: "192.168.1.55",
        origin: "http://192.168.1.55:4173",
        port: "4173",
        protocol: "http:",
      }),
    ).toBe("http://192.168.1.55:4000");
  });
});
