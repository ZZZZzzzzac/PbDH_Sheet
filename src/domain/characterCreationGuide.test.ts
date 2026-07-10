import { describe, expect, it } from "vitest";
import { nextGuideStep, previousGuideStep, startGuideSession } from "./characterCreationGuide";

describe("Guide Session", () => {
  it("starts at the first step and stays within navigation boundaries", () => {
    const started = startGuideSession();
    expect(started).toEqual({ stepIndex: 0 });
    expect(previousGuideStep(started)).toEqual({ stepIndex: 0 });

    const second = nextGuideStep(started, 3);
    expect(second).toEqual({ stepIndex: 1 });
    expect(nextGuideStep(nextGuideStep(second, 3), 3)).toEqual({ stepIndex: 2 });
    expect(previousGuideStep(second)).toEqual({ stepIndex: 0 });
  });

  it("creates a fresh first-step session for every start", () => {
    const advanced = nextGuideStep(startGuideSession(), 2);
    expect(advanced.stepIndex).toBe(1);
    expect(startGuideSession()).toEqual({ stepIndex: 0 });
  });
});
