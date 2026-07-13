import { useLayoutEffect, useState, type RefObject } from "react";
import { findLargestFittingFontSize, type FontSizeFitResult } from "./fontSizeFit";

export { findLargestFittingFontSize } from "./fontSizeFit";
export type CardDescriptionFitResult = FontSizeFitResult;

export const minimumCardDescriptionFontSizePx = 9;

export function fitCardDescription(element: HTMLElement): CardDescriptionFitResult {
  element.style.removeProperty("font-size");
  const computedFontSizePx = Number.parseFloat(getComputedStyle(element).fontSize);
  const naturalFontSizePx = Number.isFinite(computedFontSizePx) && computedFontSizePx > 0 ? computedFontSizePx : 16;
  const maxFontSizePx = Math.max(minimumCardDescriptionFontSizePx, naturalFontSizePx);
  const measuredResult = findLargestFittingFontSize({
    minFontSizePx: minimumCardDescriptionFontSizePx,
    maxFontSizePx,
    fits: (fontSizePx) => {
      element.style.fontSize = `${fontSizePx}px`;
      return element.scrollHeight <= element.clientHeight + 1 && element.scrollWidth <= element.clientWidth + 1;
    },
  });
  const result = naturalFontSizePx < minimumCardDescriptionFontSizePx
    ? { ...measuredResult, fitted: true }
    : measuredResult;

  if (!result.fitted) {
    element.style.removeProperty("font-size");
  } else {
    element.style.fontSize = `${result.fontSizePx}px`;
  }
  element.dataset.cardDescriptionFit = result.overflowing ? "overflow" : result.fitted ? "fitted" : "natural";
  element.dataset.cardDescriptionFontSize = String(result.fontSizePx);
  element.dataset.cardDescriptionFitPending = "false";
  return result;
}

export function useCardDescriptionFit(ref: RefObject<HTMLElement | null>, contentKey: string, enabled: boolean): boolean {
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !enabled) {
      if (element) resetCardDescriptionFit(element);
      setOverflowing(false);
      return;
    }

    let disposed = false;
    const runFit = () => {
      if (disposed || !element.isConnected) return;
      const result = fitCardDescription(element);
      setOverflowing((current) => (current === result.overflowing ? current : result.overflowing));
    };
    const scheduleFit = () => {
      if (disposed) return;
      element.dataset.cardDescriptionFitPending = "true";
      scheduleFitTask(element, runFit);
    };

    scheduleFit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleFit);
    observer?.observe(element);
    if (!observer) window.addEventListener("resize", scheduleFit);
    const fontReady = document.fonts?.ready;
    fontReady?.then(scheduleFit).catch(() => undefined);

    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("resize", scheduleFit);
      cancelFitTask(element);
    };
  }, [contentKey, enabled, ref]);

  return overflowing;
}

export async function waitForCardDescriptionFits(root: ParentNode, timeoutMs = 750): Promise<void> {
  await document.fonts?.ready;
  const deadline = performance.now() + timeoutMs;
  while (root.querySelector('[data-card-description-fit-pending="true"]') && performance.now() < deadline) {
    await nextAnimationFrame();
  }
}

function resetCardDescriptionFit(element: HTMLElement) {
  element.style.removeProperty("font-size");
  delete element.dataset.cardDescriptionFit;
  delete element.dataset.cardDescriptionFontSize;
  delete element.dataset.cardDescriptionFitPending;
}

type FitTask = () => void;
const scheduledFitTasks = new Map<HTMLElement, FitTask>();
let scheduledFrameId: number | null = null;

function scheduleFitTask(element: HTMLElement, task: FitTask) {
  scheduledFitTasks.set(element, task);
  if (scheduledFrameId !== null) return;
  scheduledFrameId = window.requestAnimationFrame(() => {
    scheduledFrameId = null;
    const tasks = [...scheduledFitTasks.values()];
    scheduledFitTasks.clear();
    tasks.forEach((scheduledTask) => scheduledTask());
  });
}

function cancelFitTask(element: HTMLElement) {
  scheduledFitTasks.delete(element);
  if (scheduledFitTasks.size === 0 && scheduledFrameId !== null) {
    window.cancelAnimationFrame(scheduledFrameId);
    scheduledFrameId = null;
  }
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}
