import { describe, expect, it, vi } from "vitest";
import { render, click, change } from "../../test/render";
import { CompetitionList } from "./CompetitionList";

describe("CompetitionList", () => {
  it("invokes import callback when a JSON file is selected", () => {
    const onImport = vi.fn();
    const view = render(
      <CompetitionList
        competitions={[]}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onImport={onImport}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const trigger = view.container.querySelector(
      '[data-testid="admin-import-competition-trigger"]',
    ) as HTMLButtonElement | null;
    const input = view.container.querySelector(
      '[data-testid="admin-import-file-input"]',
    ) as HTMLInputElement | null;

    expect(trigger).not.toBeNull();
    expect(input).not.toBeNull();

    click(trigger!);

    const file = new File(["{}"], "competition.json", {
      type: "application/json",
    });
    Object.defineProperty(input!, "files", {
      configurable: true,
      value: [file],
    });
    change(input!);

    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledWith(file);
    view.unmount();
  });

  it("renders import feedback status", () => {
    const view = render(
      <CompetitionList
        competitions={[]}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onImport={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        importStatus={{ type: "error", message: "Import failed" }}
      />,
    );

    const status = view.container.querySelector(
      '[data-testid="admin-import-status"]',
    );
    expect(status?.textContent).toContain("Import failed");
    view.unmount();
  });
});
