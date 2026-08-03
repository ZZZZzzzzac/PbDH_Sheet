import { describe, expect, it } from "vitest";
import {
  cropSelectionFromLayout,
  initialCropLayout,
  moveCrop,
  resizeFreeCrop,
  zoomCrop,
} from "./playerImageCrop";

describe("Player Image crop geometry", () => {
  it("starts with a centered free-aspect crop contained by wide and tall images", () => {
    for (const [width, height] of [[1600, 900], [900, 1600]]) {
      const layout = initialCropLayout(width, height);
      expect(layout.cropX).toBeGreaterThanOrEqual(layout.imageX);
      expect(layout.cropY).toBeGreaterThanOrEqual(layout.imageY);
      expect(layout.cropX + layout.cropWidth).toBeLessThanOrEqual(layout.imageX + layout.imageWidth);
      expect(layout.cropY + layout.cropHeight).toBeLessThanOrEqual(layout.imageY + layout.imageHeight);
    }
  });

  it("moves and resizes every corner without leaving the source image", () => {
    const layout = initialCropLayout(1600, 900);
    const moved = moveCrop(layout, -500, 900);
    expect(moved.cropX).toBe(layout.imageX);
    expect(moved.cropY + moved.cropHeight).toBeCloseTo(layout.imageY + layout.imageHeight);

    for (const corner of ["nw", "ne", "sw", "se"] as const) {
      const resized = resizeFreeCrop(layout, corner, -1000, 2000);
      expect(resized.cropX).toBeGreaterThanOrEqual(layout.imageX);
      expect(resized.cropY).toBeGreaterThanOrEqual(layout.imageY);
      expect(resized.cropX + resized.cropWidth).toBeLessThanOrEqual(layout.imageX + layout.imageWidth);
      expect(resized.cropY + resized.cropHeight).toBeLessThanOrEqual(layout.imageY + layout.imageHeight);
      expect(resized.cropWidth).toBeGreaterThan(0);
      expect(resized.cropHeight).toBeGreaterThan(0);
    }
  });

  it("zooms around the pointer while preserving ratio and bounds", () => {
    const layout = initialCropLayout(1600, 900);
    const zoomed = zoomCrop(layout, layout.cropX + 40, layout.cropY + 30, -800);
    expect(zoomed.cropWidth).toBeLessThan(layout.cropWidth);
    expect(zoomed.cropWidth / zoomed.cropHeight).toBeCloseTo(layout.cropWidth / layout.cropHeight);
    expect(zoomed.cropX).toBeGreaterThanOrEqual(layout.imageX);
    expect(zoomed.cropY).toBeGreaterThanOrEqual(layout.imageY);
  });

  it("projects the confirmed crop back to source-image coordinates", () => {
    const layout = initialCropLayout(1600, 900);
    const selection = cropSelectionFromLayout(layout);
    expect(selection.sourceWidth).toBe(1600);
    expect(selection.sourceHeight).toBe(900);
    expect(selection.width).toBeCloseTo(1440);
    expect(selection.height).toBeCloseTo(810);
    expect(selection.x).toBeCloseTo(80);
    expect(selection.y).toBeCloseTo(45);
  });
});
