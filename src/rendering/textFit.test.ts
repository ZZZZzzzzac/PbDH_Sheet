import { afterEach, describe, expect, it, vi } from "vitest";
import { fitSingleLineTextContent } from "./textFit";

describe("single-line text fitting", () => {
  afterEach(() => vi.restoreAllMocks());

  it("measures overflowing Markdown content even when the preview itself reports no scroll overflow", () => {
    const preview = document.createElement("div");
    preview.innerHTML = '<div data-restricted-markdown="true"><p>一个很长很长的角色姓名</p></div>';
    document.body.append(preview);
    const paragraph = preview.querySelector<HTMLElement>("p");
    vi.spyOn(window, "getComputedStyle").mockReturnValue({ fontSize: "16px" } as CSSStyleDeclaration);
    Object.defineProperties(preview, {
      clientHeight: { configurable: true, get: () => 30 },
      clientWidth: { configurable: true, get: () => 100 },
      scrollHeight: { configurable: true, get: () => 20 },
      scrollWidth: { configurable: true, get: () => 100 },
    });
    Object.defineProperties(paragraph, {
      scrollHeight: { configurable: true, get: () => 20 },
      scrollWidth: {
        configurable: true,
        get: () => Number.parseFloat(preview.style.fontSize || "16") <= 10 ? 90 : 200,
      },
    });

    const result = fitSingleLineTextContent(preview);

    expect(result.fitted).toBe(true);
    expect(result.overflowing).toBe(false);
    expect(result.fontSizePx).toBeLessThanOrEqual(10);
    preview.remove();
  });
});
