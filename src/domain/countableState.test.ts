import { describe, expect, it } from "vitest";
import { canTransitionCountableState, transitionCountableState } from "./countableState";

describe("Countable Resource transitions", () => {
  const editable = { min: 0, step: 2, editableMax: true };

  it("applies step and clamps current within finite and unbounded bounds", () => {
    expect(transitionCountableState({ current: 5, max: 6 }, editable, "current", "increment")).toEqual({ current: 6, max: 6 });
    expect(transitionCountableState({ current: 1, max: 6 }, editable, "current", "decrement")).toEqual({ current: 0, max: 6 });
    expect(transitionCountableState({ current: 5, max: null }, editable, "current", "increment")).toEqual({ current: 7, max: null });
  });

  it("keeps an unbounded or locked maximum unchanged", () => {
    expect(transitionCountableState({ current: 3, max: null }, editable, "maximum", "increment")).toEqual({ current: 3, max: null });
    expect(transitionCountableState({ current: 3, max: 6 }, { ...editable, editableMax: false }, "maximum", "increment")).toEqual({ current: 3, max: 6 });
  });

  it("clamps current atomically when maximum shrinks below it", () => {
    expect(transitionCountableState({ current: 5, max: 6 }, editable, "maximum", "decrement")).toEqual({ current: 4, max: 4 });
    expect(transitionCountableState({ current: 1, max: 1 }, editable, "maximum", "decrement")).toEqual({ current: 0, max: 0 });
  });

  it("reports whether either stepper target can change state", () => {
    expect(canTransitionCountableState({ current: 6, max: 6 }, editable, "current", "increment")).toBe(false);
    expect(canTransitionCountableState({ current: 6, max: 6 }, editable, "maximum", "increment")).toBe(true);
    expect(canTransitionCountableState({ current: 0, max: 0 }, { ...editable, editableMax: false }, "current", "decrement")).toBe(false);
  });
});
