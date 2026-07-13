import { afterEach, describe, expect, it, vi } from "vitest";
import { fitMarkerPresentation, minimumMarkerFontSizePx } from "./markerPresentationFit";

describe("Marker Presentation fitting", () => {
  afterEach(() => vi.restoreAllMocks());

  it("stops at 5px and exposes residual overflow without changing region height", () => {
    const element = document.createElement("span");
    document.body.append(element);
    vi.spyOn(window, "getComputedStyle").mockReturnValue({ fontSize: "16px" } as CSSStyleDeclaration);
    Object.defineProperties(element, {
      clientHeight: { configurable: true, get: () => 28 },
      clientWidth: { configurable: true, get: () => 100 },
      scrollHeight: { configurable: true, get: () => 56 },
      scrollWidth: { configurable: true, get: () => 200 },
    });

    const result = fitMarkerPresentation(element);

    expect(minimumMarkerFontSizePx).toBe(5);
    expect(result).toEqual({ fontSizePx: 5, fitted: true, overflowing: true });
    expect(element.style.fontSize).toBe("5px");
    expect(element).toHaveAttribute("data-marker-fit", "overflow");
    element.remove();
  });
});
