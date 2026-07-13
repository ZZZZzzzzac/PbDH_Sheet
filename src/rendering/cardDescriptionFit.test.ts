import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findLargestFittingFontSize,
  fitCardDescription,
  minimumCardDescriptionFontSizePx,
} from "./cardDescriptionFit";

describe("Card description fitting", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps the computed size when the description already fits", () => {
    const result = findLargestFittingFontSize({
      minFontSizePx: minimumCardDescriptionFontSizePx,
      maxFontSizePx: 16,
      fits: () => true,
    });

    expect(result).toEqual({ fontSizePx: 16, fitted: false, overflowing: false });
  });

  it("selects the largest quarter-pixel size that fits", () => {
    const result = findLargestFittingFontSize({
      minFontSizePx: minimumCardDescriptionFontSizePx,
      maxFontSizePx: 16,
      fits: (fontSizePx) => fontSizePx <= 11.5,
    });

    expect(result).toEqual({ fontSizePx: 11.5, fitted: true, overflowing: false });
  });

  it("stops at 9px and reports remaining overflow", () => {
    const result = findLargestFittingFontSize({
      minFontSizePx: minimumCardDescriptionFontSizePx,
      maxFontSizePx: 16,
      fits: () => false,
    });

    expect(result).toEqual({ fontSizePx: 9, fitted: true, overflowing: true });
  });

  it("measures rendered element overflow and exposes transient fit state", () => {
    const element = document.createElement("div");
    document.body.append(element);
    vi.spyOn(window, "getComputedStyle").mockReturnValue({ fontSize: "16px" } as CSSStyleDeclaration);
    Object.defineProperties(element, {
      clientHeight: { configurable: true, get: () => 100 },
      clientWidth: { configurable: true, get: () => 200 },
      scrollHeight: { configurable: true, get: () => Number.parseFloat(element.style.fontSize) * 8 },
      scrollWidth: { configurable: true, get: () => 200 },
    });

    const result = fitCardDescription(element);

    expect(result.fontSizePx).toBe(12.5);
    expect(result.overflowing).toBe(false);
    expect(element.style.fontSize).toBe("12.5px");
    expect(element).toHaveAttribute("data-card-description-fit", "fitted");
    element.remove();
  });

  it("enforces the 9px floor even when scoped CSS computes a smaller size", () => {
    const element = document.createElement("div");
    document.body.append(element);
    vi.spyOn(window, "getComputedStyle").mockReturnValue({ fontSize: "8px" } as CSSStyleDeclaration);
    Object.defineProperties(element, {
      clientHeight: { configurable: true, get: () => 100 },
      clientWidth: { configurable: true, get: () => 200 },
      scrollHeight: { configurable: true, get: () => 80 },
      scrollWidth: { configurable: true, get: () => 200 },
    });

    const result = fitCardDescription(element);

    expect(result).toEqual({ fontSizePx: 9, fitted: true, overflowing: false });
    expect(element.style.fontSize).toBe("9px");
    element.remove();
  });
});
