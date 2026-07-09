import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { CardFace } from "../components/CardFace";
import type { CardInstance } from "../types";

const card: CardInstance = {
  instanceId: "i1",
  cardId: "c1",
  name: "Grizzly Bears",
  manaCost: "{1}{G}",
  cmc: 2,
  typeLine: "Creature — Bear",
  colors: ["G"],
  imageUri: null,
  imageUriBack: null,
  power: 2,
  toughness: 2,
  loyalty: null,
  tapped: false,
  transformed: false,
  faceDown: false,
  counters: {},
  attachedTo: null,
  token: false,
};

function fireCancelable(el: Element, type: string): boolean {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
  return ev.defaultPrevented;
}

describe("CardFace touchend click suppression", () => {
  // Regression: a touch tap on a hand card opened CardDetailModal, then the
  // browser's tap-synthesized `click` (NOT suppressed by preventDefault on
  // pointerdown — it is not a compatibility mouse event) hit-tested against
  // the freshly-mounted modal backdrop and instantly closed it. Canceling
  // touchend suppresses that synthesized click.
  it("prevents default on touchend when interactive", () => {
    const { container } = render(<CardFace card={card} zone="hand" onTap={vi.fn()} />);
    const el = container.querySelector(".card-face")!;
    expect(fireCancelable(el, "touchend")).toBe(true);
  });

  it("does not prevent default on touchend when not interactive", () => {
    const { container } = render(<CardFace card={card} zone="hand" />);
    const el = container.querySelector(".card-face")!;
    expect(fireCancelable(el, "touchend")).toBe(false);
  });
});
