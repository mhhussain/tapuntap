import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseMtgArena, fetchCardNameCatalog, _resetCatalogCache, resolveCards } from "../lib/import";

describe("parseMtgArena", () => {
  it("parses quantity and name from standard lines", () => {
    const result = parseMtgArena("4 Lightning Bolt\n2 Island");
    expect(result).toEqual([
      { quantity: 4, name: "Lightning Bolt" },
      { quantity: 2, name: "Island" },
    ]);
  });

  it("skips blank lines", () => {
    const result = parseMtgArena("4 Lightning Bolt\n\n2 Island");
    expect(result).toHaveLength(2);
  });

  it("skips section headers: Deck, Sideboard, Commander, Companion", () => {
    const result = parseMtgArena("Deck\n4 Lightning Bolt\nSideboard\n2 Duress\nCommander\n1 Sol Ring\nCompanion\n1 Lurrus");
    expect(result).toEqual([
      { quantity: 4, name: "Lightning Bolt" },
      { quantity: 2, name: "Duress" },
      { quantity: 1, name: "Sol Ring" },
      { quantity: 1, name: "Lurrus" },
    ]);
  });

  it("skips lines starting with //", () => {
    const result = parseMtgArena("// This is a comment\n4 Lightning Bolt");
    expect(result).toEqual([{ quantity: 4, name: "Lightning Bolt" }]);
  });

  it("skips lines with no leading quantity token", () => {
    const result = parseMtgArena("Lightning Bolt");
    expect(result).toHaveLength(0);
  });

  it("handles multi-word card names", () => {
    const result = parseMtgArena("1 Black Lotus");
    expect(result).toEqual([{ quantity: 1, name: "Black Lotus" }]);
  });

  it("returns empty array for empty or whitespace-only input", () => {
    expect(parseMtgArena("")).toEqual([]);
    expect(parseMtgArena("  \n  \n  ")).toEqual([]);
  });
});

describe("fetchCardNameCatalog", () => {
  beforeEach(() => {
    _resetCatalogCache();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the catalog URL and returns a Set of lowercased names", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ data: ["Lightning Bolt", "Counterspell", "Sol Ring"] }),
    });

    const catalog = await fetchCardNameCatalog();
    expect(catalog).not.toBeNull();
    expect(catalog!.has("lightning bolt")).toBe(true);
    expect(catalog!.has("Lightning Bolt")).toBe(false);
    expect(catalog!.has("counterspell")).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith("https://api.scryfall.com/catalog/card-names");
  });

  it("caches the result — calls fetch only once across two awaits", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ data: ["Lightning Bolt"] }),
    });

    await fetchCardNameCatalog();
    await fetchCardNameCatalog();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns null when the network fetch fails", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));
    const catalog = await fetchCardNameCatalog();
    expect(catalog).toBeNull();
  });
});

describe("resolveCards", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches each name from the Scryfall named endpoint and returns the card", async () => {
    const mockCard = { id: "abc123", name: "Lightning Bolt" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCard),
    }));

    const result = await resolveCards(["Lightning Bolt"]);
    expect(result.get("Lightning Bolt")).toEqual(mockCard);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.scryfall.com/cards/named?exact=Lightning%20Bolt"
    );
  });

  it("returns null for a name that gets a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }));

    const result = await resolveCards(["Mox Peerl"]);
    expect(result.get("Mox Peerl")).toBeNull();
  });

  it("returns null for a name where fetch throws a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const result = await resolveCards(["Lightning Bolt"]);
    expect(result.get("Lightning Bolt")).toBeNull();
  });

  it("deduplicates names before fetching — calls fetch once for duplicate names", async () => {
    const mockCard = { id: "abc123", name: "Lightning Bolt" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCard),
    }));

    const result = await resolveCards(["Lightning Bolt", "Lightning Bolt"]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(result.get("Lightning Bolt")).toEqual(mockCard);
  });

  it("returns empty map for empty input without calling fetch", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await resolveCards([]);
    expect(result.size).toBe(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("processes all names and returns results for each", async () => {
    const names = ["A", "B", "C", "D", "E", "F", "G"];
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string) =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "x", name: "Card" }) })
    ));

    const result = await resolveCards(names);
    expect(globalThis.fetch).toHaveBeenCalledTimes(7);
    expect(result.size).toBe(7);
  });
});
