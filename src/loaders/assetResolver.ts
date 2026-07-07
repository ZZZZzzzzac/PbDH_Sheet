import type { PackageIssue } from "../domain/systemPackage";
import type { PackageVirtualFileSystem } from "./packageVfs";

export type AssetResolveResult =
  | {
      ok: true;
      path: string;
      bytes: Uint8Array;
      mimeType: string;
      objectUrl: string | null;
    }
  | { ok: false; issue: PackageIssue };

export interface AssetResolver {
  resolveAsset: (assetRef: string, mimeType?: string) => AssetResolveResult;
  revokeAll: () => void;
}

export function createAssetResolver(vfs: PackageVirtualFileSystem): AssetResolver {
  const objectUrls = new Set<string>();

  return {
    resolveAsset(assetRef, mimeType = inferMimeType(assetRef)) {
      const read = vfs.readBytes(assetRef);
      if (!read.ok) {
        return { ok: false, issue: read.issue };
      }

      const objectUrl = createObjectUrl(read.value, mimeType);
      if (objectUrl) {
        objectUrls.add(objectUrl);
      }

      return {
        ok: true,
        path: read.path,
        bytes: read.value,
        mimeType,
        objectUrl,
      };
    },

    revokeAll() {
      if (typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") {
        objectUrls.clear();
        return;
      }

      for (const objectUrl of objectUrls) {
        URL.revokeObjectURL(objectUrl);
      }
      objectUrls.clear();
    },
  };
}

function createObjectUrl(bytes: Uint8Array, mimeType: string): string | null {
  if (typeof Blob === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return null;
  }

  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return URL.createObjectURL(new Blob([buffer], { type: mimeType }));
}

function inferMimeType(path: string): string {
  const lowerPath = path.toLowerCase();

  if (lowerPath.endsWith(".png")) {
    return "image/png";
  }
  if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lowerPath.endsWith(".webp")) {
    return "image/webp";
  }
  if (lowerPath.endsWith(".svg")) {
    return "image/svg+xml";
  }
  if (lowerPath.endsWith(".json")) {
    return "application/json";
  }
  if (lowerPath.endsWith(".txt")) {
    return "text/plain";
  }

  return "application/octet-stream";
}
