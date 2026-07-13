import { findLargestFittingFontSize, type FontSizeFitResult } from "./fontSizeFit";
import { useLayoutEffect, type RefObject } from "react";

export const minimumMarkerFontSizePx = 5;

export function fitMarkerPresentation(element: HTMLElement): FontSizeFitResult {
  element.style.removeProperty("font-size");
  delete element.dataset.markerFit;
  const computedFontSizePx = Number.parseFloat(getComputedStyle(element).fontSize);
  const naturalFontSizePx = Number.isFinite(computedFontSizePx) && computedFontSizePx > 0 ? computedFontSizePx : 16;
  const maxFontSizePx = Math.max(minimumMarkerFontSizePx, naturalFontSizePx);
  const measuredResult = findLargestFittingFontSize({
    minFontSizePx: minimumMarkerFontSizePx,
    maxFontSizePx,
    fits: (fontSizePx) => {
      element.style.fontSize = `${fontSizePx}px`;
      return element.scrollHeight <= element.clientHeight + 1 && element.scrollWidth <= element.clientWidth + 1;
    },
  });
  const result = naturalFontSizePx < minimumMarkerFontSizePx
    ? { ...measuredResult, fitted: true }
    : measuredResult;

  if (!result.fitted) element.style.removeProperty("font-size");
  else element.style.fontSize = `${result.fontSizePx}px`;
  element.dataset.markerFit = result.overflowing ? "overflow" : result.fitted ? "fitted" : "natural";
  element.dataset.markerFontSize = String(result.fontSizePx);
  element.dataset.markerFitPending = "false";
  return result;
}

export function useMarkerPresentationFit(ref: RefObject<HTMLElement | null>, contentKey: string, enabled: boolean): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    let disposed = false;
    let frameId: number | null = null;
    const runFit = () => {
      frameId = null;
      if (!disposed && element.isConnected) fitMarkerPresentation(element);
    };
    const scheduleFit = () => {
      if (disposed) return;
      element.dataset.markerFitPending = "true";
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(runFit);
    };

    scheduleFit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleFit);
    observer?.observe(element);
    if (!observer) window.addEventListener("resize", scheduleFit);
    document.fonts?.ready.then(scheduleFit).catch(() => undefined);

    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("resize", scheduleFit);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [contentKey, enabled, ref]);
}

export async function waitForMarkerPresentationFits(root: ParentNode, timeoutMs = 750): Promise<void> {
  await document.fonts?.ready;
  const deadline = performance.now() + timeoutMs;
  while (root.querySelector('[data-marker-fit-pending="true"]') && performance.now() < deadline) {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  }
}
