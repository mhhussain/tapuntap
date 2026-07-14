import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { ContextMenu } from "../components/ContextMenu";

describe("ContextMenu", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => vi.useRealTimers());

  function clickWithPointerType(el: Element, pointerType: string | undefined) {
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    if (pointerType !== undefined) {
      Object.defineProperty(ev, "pointerType", { value: pointerType });
    }
    el.dispatchEvent(ev);
  }

  it("ignores touch item clicks within 300ms of opening (long-press open-guard)", () => {
    const onClick = vi.fn();
    const onClose = vi.fn();
    render(
      <ContextMenu items={[{ label: "Tap", onClick }]} x={0} y={0} onClose={onClose} />
    );
    clickWithPointerType(screen.getByText("Tap"), "touch");
    expect(onClick).not.toHaveBeenCalled();

    // Missing pointerType (older browsers) fails safe into the guard too.
    clickWithPointerType(screen.getByText("Tap"), undefined);
    expect(onClick).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    clickWithPointerType(screen.getByText("Tap"), "touch");
    expect(onClick).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("lets mouse clicks through the open-guard (fast right-click then click)", () => {
    const onClick = vi.fn();
    const onClose = vi.fn();
    render(
      <ContextMenu items={[{ label: "Tap", onClick }]} x={0} y={0} onClose={onClose} />
    );
    clickWithPointerType(screen.getByText("Tap"), "mouse");
    expect(onClick).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on outside pointerdown", () => {
    const onClose = vi.fn();
    render(
      <ContextMenu items={[{ label: "Tap", onClick: vi.fn() }]} x={0} y={0} onClose={onClose} />
    );
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });
});
