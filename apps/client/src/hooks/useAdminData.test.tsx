import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { flushEffects } from "../test/render";
import { renderHook } from "./testUtils";
import { useAdminData } from "./useAdminData";

describe("useAdminData", () => {
  it("is not loading when there is no admin token", async () => {
    const onUnauthorized = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const hook = renderHook(() => useAdminData(null, onUnauthorized));
    await flushEffects();

    expect(hook.result.isLoading).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    hook.unmount();
  });

  it("sends the admin header and logs out on unauthorized responses", async () => {
    const onUnauthorized = vi.fn();
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
    }) as Response);
    vi.stubGlobal("fetch", fetchMock);

    const hook = renderHook(() => useAdminData("secret-token", onUnauthorized));
    await flushEffects();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/competitions"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer secret-token",
        }),
      }),
    );
    expect(onUnauthorized).toHaveBeenCalled();
    hook.unmount();
  });

  it("imports competition by parsing file JSON and posting to import endpoint", async () => {
    const onUnauthorized = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: "comp-1" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ id: "comp-1", title: "Imported" }],
      } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const hook = renderHook(() => useAdminData("secret-token", onUnauthorized));
    await flushEffects();

    const file = new File(
      [
        JSON.stringify({
          competition: { title: "Imported" },
          rounds: [
            {
              title: "Round 1",
              type: "STANDARD",
              orderIndex: 1,
              questions: [
                {
                  questionText: "Q1",
                  type: "OPEN_WORD",
                  points: 1,
                  timeLimitSeconds: 30,
                  grading: "AUTO",
                  content: { answer: "A" },
                },
              ],
            },
          ],
        }),
      ],
      "competition.json",
      { type: "application/json" },
    );

    const result = await act(async () => hook.result.importCompetitionFromFile(file));
    expect(result.ok).toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/competitions/import"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer secret-token",
          "Content-Type": "application/json",
        }),
      }),
    );

    hook.unmount();
  });

  it("returns invalid-json error for unreadable import file", async () => {
    const onUnauthorized = vi.fn();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [],
    }) as Response);
    vi.stubGlobal("fetch", fetchMock);

    const hook = renderHook(() => useAdminData("secret-token", onUnauthorized));
    await flushEffects();

    const invalidFile = new File(["{ invalid"], "bad.json", {
      type: "application/json",
    });
    const result = await act(async () =>
      hook.result.importCompetitionFromFile(invalidFile),
    );
    expect(result).toEqual({
      ok: false,
      message: "admin.import_invalid_json",
    });
    hook.unmount();
  });
});
