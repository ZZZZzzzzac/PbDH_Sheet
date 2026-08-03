import type { PlayerImageCropSelection } from "./playerImageCrop";

const maxInputBytes = 10 * 1024 * 1024;
const maxDecodedPixels = 40_000_000;
const maxOutputBytes = 5 * 1024 * 1024;
const maxOutputDimension = 1600;

export async function cropPlayerImage(file: File, selection: PlayerImageCropSelection): Promise<File> {
  validatePlayerImageFile(file);
  const bitmap = await decodeImage(file);
  try {
    if (bitmap.width * bitmap.height > maxDecodedPixels) {
      throw new Error("图片解码后超过 4000 万像素限制，请缩小尺寸。");
    }
    validateCropSelection(selection, bitmap.width, bitmap.height);
    const dimensions = processedImageDimensions(selection.width, selection.height);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法处理图片。");
    context.drawImage(
      bitmap,
      selection.x,
      selection.y,
      selection.width,
      selection.height,
      0,
      0,
      dimensions.width,
      dimensions.height,
    );
    const blob = await encodeWebp(canvas);
    const baseName = file.name.replace(/\.[^.]+$/u, "") || "player-image";
    return new File([blob], `${baseName}.webp`, { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}

export function processedImageDimensions(cropWidth: number, cropHeight: number): { width: number; height: number } {
  if (!Number.isFinite(cropWidth) || !Number.isFinite(cropHeight) || cropWidth <= 0 || cropHeight <= 0) {
    throw new Error("裁剪区域无效。");
  }
  const scale = Math.min(1, maxOutputDimension / cropWidth, maxOutputDimension / cropHeight);
  return {
    width: Math.max(1, Math.round(cropWidth * scale)),
    height: Math.max(1, Math.round(cropHeight * scale)),
  };
}

function validatePlayerImageFile(file: File) {
  if (file.size > maxInputBytes) throw new Error("图片压缩体积超过 10 MB 限制，请先压缩后重试。");
  const supportedName = /\.(?:jpe?g|png|webp)$/iu.test(file.name);
  const supportedType = /image\/(?:jpeg|png|webp)/iu.test(file.type);
  if (!supportedName && !supportedType) throw new Error("仅支持 JPEG、PNG 和 WebP 光栅图片。");
}

function validateCropSelection(selection: PlayerImageCropSelection, width: number, height: number) {
  const values = [selection.sourceWidth, selection.sourceHeight, selection.x, selection.y, selection.width, selection.height];
  if (values.some((value) => !Number.isFinite(value))
    || Math.abs(selection.sourceWidth - width) > 1
    || Math.abs(selection.sourceHeight - height) > 1
    || selection.x < 0
    || selection.y < 0
    || selection.width <= 0
    || selection.height <= 0
    || selection.x + selection.width > width + 1
    || selection.y + selection.height > height + 1) {
    throw new Error("裁剪区域无效，请重新选择。");
  }
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("图片已损坏或无法解码，请更换文件。");
  }
}

async function encodeWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  for (const quality of [0.9, 0.85, 0.8, 0.75]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob || blob.type !== "image/webp") throw new Error("当前浏览器不支持 WebP 图片处理。");
    if (blob.size <= maxOutputBytes) return blob;
  }
  throw new Error("图片无法在可接受画质下压缩到 5 MB，请缩小裁剪区域后重试。");
}
