import { describe, expect, it, vi } from "vitest";
import { flushEffects } from "../test/render";
import { renderHook } from "./testUtils";
import { useAdminData } from "./useAdminData";

describe("useAdminData", () => {
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
});
