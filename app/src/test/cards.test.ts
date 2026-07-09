import { describe, it, expect } from "vitest";
import { isLand, shuffle, newInstanceId, groupCardsByType, sortCardsByName } from "../lib/cards";

describe("isLand", () => {
  it("detects land type lines", () => {
    expect(isLand("Basic Land — Island")).toBe(true);
    expect(isLand("Creature — Elf")).toBe(false);
    expect(isLand("")).toBe(false);
  });
});

describe("shuffle", () => {
  it("returns same multiset, new array", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input);
    expect(out).not.toBe(input);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("newInstanceId", () => {
  it("returns a unique-ish string", () => {
    expect(newInstanceId()).not.toEqual(newInstanceId());
  });
});

describe("groupCardsByType", () => {
  const card = (typeLine: string, name = typeLine) => ({ name, typeLine });

  it("classifies by card type, not first word", () => {
    const groups = groupCardsByType([card("Legendary Creature — Elf Druid")]);
    expect(groups).toEqual([{ group: "Creatures", cards: [card("Legendary Creature — Elf Druid")] }]);
  });

  it("creature wins over artifact/enchantment in compound types", () => {
    expect(groupCardsByType([card("Artifact Creature — Golem")])[0].group).toBe("Creatures");
    expect(groupCardsByType([card("Enchantment Creature — God")])[0].group).toBe("Creatures");
  });

  it("land wins over everything", () => {
    expect(groupCardsByType([card("Legendary Land")])[0].group).toBe("Lands");
    expect(groupCardsByType([card("Land Creature — Forest Dryad")])[0].group).toBe("Lands");
    expect(groupCardsByType([card("Artifact Land")])[0].group).toBe("Lands");
  });

  it("maps each primary type to its group", () => {
    expect(groupCardsByType([card("Planeswalker — Jace")])[0].group).toBe("Planeswalkers");
    expect(groupCardsByType([card("Artifact — Equipment")])[0].group).toBe("Artifacts");
    expect(groupCardsByType([card("Legendary Enchantment")])[0].group).toBe("Enchantments");
    expect(groupCardsByType([card("Sorcery")])[0].group).toBe("Sorceries");
    expect(groupCardsByType([card("Instant")])[0].group).toBe("Instants");
  });

  it("unknown types and missing typeLine go to Other", () => {
    expect(groupCardsByType([card("Battle — Siege")])[0].group).toBe("Other");
    expect(groupCardsByType([{ name: "x", typeLine: undefined }])[0].group).toBe("Other");
  });

  it("orders groups: Planeswalkers, Creatures, Artifacts, Enchantments, Sorceries, Instants, Lands, Other", () => {
    const groups = groupCardsByType([
      card("Instant"), card("Land"), card("Creature — Bear"), card("Battle — Siege"),
      card("Sorcery"), card("Planeswalker — Chandra"), card("Enchantment"), card("Artifact"),
    ]);
    expect(groups.map((g) => g.group)).toEqual([
      "Planeswalkers", "Creatures", "Artifacts", "Enchantments", "Sorceries", "Instants", "Lands", "Other",
    ]);
  });

  it("only creature-type subtypes right of the em-dash do not misclassify", () => {
    // "Instant — Arcane" must not match on subtype words
    expect(groupCardsByType([card("Instant — Arcane")])[0].group).toBe("Instants");
  });
});

describe("sortCardsByName", () => {
  it("sorts alphabetically, case-insensitive", () => {
    const cards = [{ name: "Zombie" }, { name: "apple" }, { name: "Bear" }];
    expect(sortCardsByName(cards).map((c) => c.name)).toEqual(["apple", "Bear", "Zombie"]);
  });

  it("does not mutate the input array", () => {
    const cards = [{ name: "Zombie" }, { name: "Apple" }];
    const out = sortCardsByName(cards);
    expect(out).not.toBe(cards);
    expect(cards.map((c) => c.name)).toEqual(["Zombie", "Apple"]);
  });
});
