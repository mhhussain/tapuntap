import { describe, it, expect, vi } from "vitest";
import { routeDrop } from "../features/game/useDragDrop";

function fakeCtx() {
  const action = vi.fn(() => Promise.resolve());
  const onError = vi.fn();
  return {
    gameId: "g1",
    actions: { action } as never,
    myPrivate: {
      hand: [{ instanceId: "c1", name: "Bolt" }],
      library: [],
    } as never,
    onError,
    action,
  };
}

describe("routeDrop", () => {
  it("hand → battlefield lane dispatches playFromHand", () => {
    const ctx = fakeCtx();
    routeDrop({
      zone: "battlefield-creatures",
      data: { instanceId: "c1", fromZone: "hand" },
      gameId: ctx.gameId,
      actions: ctx.actions,
      myPrivate: ctx.myPrivate,
      onError: ctx.onError,
    });
    expect(ctx.action).toHaveBeenCalledWith({
      type: "playFromHand",
      gameId: "g1",
      instanceId: "c1",
      toZone: "battlefield",
      tapped: false,
    });
  });

  it("battlefield → hand dispatches moveToHand", () => {
    const ctx = fakeCtx();
    routeDrop({
      zone: "hand",
      data: { instanceId: "c9", fromZone: "battlefield" },
      gameId: ctx.gameId,
      actions: ctx.actions,
      myPrivate: ctx.myPrivate,
      onError: ctx.onError,
    });
    expect(ctx.action).toHaveBeenCalledWith({
      type: "moveToHand",
      gameId: "g1",
      instanceId: "c9",
      fromZone: "battlefield",
    });
  });

  it("battlefield → battlefield is a no-op", () => {
    const ctx = fakeCtx();
    routeDrop({
      zone: "battlefield-lands",
      data: { instanceId: "c9", fromZone: "battlefield" },
      gameId: ctx.gameId,
      actions: ctx.actions,
      myPrivate: ctx.myPrivate,
      onError: ctx.onError,
    });
    expect(ctx.action).not.toHaveBeenCalled();
  });

  it("hand card not found is a no-op", () => {
    const ctx = fakeCtx();
    routeDrop({
      zone: "battlefield-creatures",
      data: { instanceId: "missing", fromZone: "hand" },
      gameId: ctx.gameId,
      actions: ctx.actions,
      myPrivate: ctx.myPrivate,
      onError: ctx.onError,
    });
    expect(ctx.action).not.toHaveBeenCalled();
  });
});
