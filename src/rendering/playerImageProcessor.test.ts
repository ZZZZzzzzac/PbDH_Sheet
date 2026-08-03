import { afterEach, describe, expect, it, vi } from "vitest";
import { cropPlayerImage, processedImageDimensions } from "./playerImageProcessor";

describe("Player Image processing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("bounds the processed image while preserving the crop ratio", () => {
    expect(processedImageDimensions(3200, 800)).toEqual({ width: 1600, height: 400 });
    expect(processedImageDimensions(400, 1200)).toEqual({ width: 400, height: 1200 });
  });

  it("rejects unsupported raster input before decoding", async () => {
    await expect(cropPlayerImage(
      new File(["gif"], "portrait.gif", { type: "image/gif" }),
      { sourceWidth: 1, sourceHeight: 1, x: 0, y: 0, width: 1, height: 1 },
    )).rejects.toThrow("仅支持 JPEG、PNG 和 WebP");
  });

  it("renders a confirmed crop to a WebP file", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 2000, height: 1000, close }));
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage })),
      toBlob: vi.fn((callback: BlobCallback) => callback(new Blob(["webp"], { type: "image/webp" }))),
    } as unknown as HTMLCanvasElement;
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => (
      tagName === "canvas" ? canvas : createElement(tagName)
    )) as typeof document.createElement);

    const result = await cropPlayerImage(
      new File(["jpeg"], "portrait.jpg", { type: "image/jpeg" }),
      { sourceWidth: 2000, sourceHeight: 1000, x: 200, y: 100, width: 1600, height: 800 },
    );

    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(800);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 200, 100, 1600, 800, 0, 0, 1600, 800);
    expect(result.name).toBe("portrait.webp");
    expect(result.type).toBe("image/webp");
    expect(close).toHaveBeenCalledOnce();
  });
});
