import { describe, expect, it, beforeEach } from "vitest";

import { usePagesStore, type PageDTO } from "@/lib/stores/pages-store";

function makePage(overrides: Partial<PageDTO> = {}): PageDTO {
  return {
    id: "page-1",
    title: "Untitled page",
    content: { type: "doc", content: [] },
    createdById: "user-1",
    updatedAt: "2026-06-18T00:00:00.000Z",
    ...overrides,
  };
}

describe("usePagesStore", () => {
  beforeEach(() => {
    usePagesStore.setState({ pages: [], selectedId: null });
  });

  it("upsertLocal adds a new page and updates an existing one", () => {
    const page = makePage();
    usePagesStore.getState().upsertLocal(page);
    expect(usePagesStore.getState().pages).toHaveLength(1);

    usePagesStore.getState().upsertLocal({ ...page, title: "Renamed" });
    const pages = usePagesStore.getState().pages;
    expect(pages).toHaveLength(1);
    expect(pages[0].title).toBe("Renamed");
  });

  it("patchLocal applies a partial update and re-sorts by updatedAt desc", () => {
    const older = makePage({ id: "page-1", updatedAt: "2026-06-17T00:00:00.000Z" });
    const newer = makePage({ id: "page-2", updatedAt: "2026-06-18T00:00:00.000Z" });
    usePagesStore.setState({ pages: [newer, older] });

    usePagesStore.getState().patchLocal("page-1", {
      title: "Touched",
      updatedAt: "2026-06-19T00:00:00.000Z",
    });

    const pages = usePagesStore.getState().pages;
    expect(pages[0].id).toBe("page-1");
    expect(pages[0].title).toBe("Touched");
  });

  it("removeLocal deletes the page and clears selection if it was selected", () => {
    const page = makePage();
    usePagesStore.setState({ pages: [page], selectedId: page.id });

    usePagesStore.getState().removeLocal(page.id);

    expect(usePagesStore.getState().pages).toHaveLength(0);
    expect(usePagesStore.getState().selectedId).toBeNull();
  });

  it("removeLocal leaves selection untouched when removing a different page", () => {
    const a = makePage({ id: "page-1" });
    const b = makePage({ id: "page-2" });
    usePagesStore.setState({ pages: [a, b], selectedId: "page-2" });

    usePagesStore.getState().removeLocal("page-1");

    expect(usePagesStore.getState().selectedId).toBe("page-2");
  });
});
