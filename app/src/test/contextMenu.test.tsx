import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { ContextMenu } from "../components/ContextMenu";

describe("ContextMenu", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => vi.useRealTimers());

  it("ignores item clicks within 300ms of opening (touch long-press guard)", () => {
    const onClick = vi.fn();
    const onClose = vi.fn();
    render(
      <ContextMenu items={[{ label: "Tap", onClick }]} x={0} y={0} onClose={onClose} />
    );
    fireEvent.click(screen.getByText("Tap"));
    expect(onClick).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    fireEvent.click(screen.getByText("Tap"));
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
