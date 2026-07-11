import { unzipSync } from "fflate";
import type { PackageIssue } from "../domain/systemPackage";

export interface PackageVirtualFileSystem {
  listFiles: () => string[];
  readBytes: (path: string) => PackageFileReadResult<Uint8Array>;
  readText: (path: string) => PackageFileReadResult<string>;
}

export type PackageFileReadResult<T> =
  | { ok: true; path: string; value: T }
  | { ok: false; issue: PackageIssue };

export type PackagePathResult =
  | { ok: true; path: string }
  | { ok: false; issue: PackageIssue };

export type PackageVirtualFileSystemResult =
  | { ok: true; vfs: PackageVirtualFileSystem }
  | { ok: false; issues: PackageIssue[] };

export interface PackageFileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
}

export interface PackageDirectoryHandle {
  kind: "directory";
  name: string;
  entries(): AsyncIterableIterator<[string, PackageFileHandle | PackageDirectoryHandle]>;
  queryPermission?(descriptor?: { mode?: "read" }): Promise<PermissionState>;
  requestPermission?(descriptor?: { mode?: "read" }): Promise<PermissionState>;
}

export function normalizePackagePath(path: string): PackagePathResult {
  const rawPath = path.trim().replaceAll("\\", "/");

  if (!rawPath) {
    return unsafePathIssue(path);
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(rawPath) || rawPath.startsWith("//") || rawPath.startsWith("/") || /^[a-z]:\//i.test(rawPath)) {
    return unsafePathIssue(path);
  }

  const parts: string[] = [];
  for (const part of rawPath.split("/")) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      return unsafePathIssue(path);
    }
    parts.push(part);
  }

  if (parts.length === 0) {
    return unsafePathIssue(path);
  }

  return { ok: true, path: parts.join("/") };
}

export function createVirtualFileSystemFromZipBytes(bytes: Uint8Array): PackageVirtualFileSystemResult {
  let entries: Record<string, Uint8Array>;

  try {
    entries = unzipSync(bytes);
  } catch {
    return {
      ok: false,
      issues: [
        {
          level: "fatal",
          code: "ZIP_READ_FAILED",
          text: "无法读取 System Package zip。",
        },
      ],
    };
  }

  const files = new Map<string, Uint8Array>();

  for (const [entryPath, data] of Object.entries(entries)) {
    if (entryPath.endsWith("/")) {
      continue;
    }

    const normalized = normalizePackagePath(entryPath);
    if (!normalized.ok) {
      return {
        ok: false,
        issues: [
          {
            ...normalized.issue,
            text: `zip 内存在不安全路径：${entryPath}`,
          },
        ],
      };
    }

    files.set(normalized.path, data);
  }

  resolveZipRootPrefix(files);

  return { ok: true, vfs: createVirtualFileSystem(files) };
}

function resolveZipRootPrefix(files: Map<string, Uint8Array>): void {
  if (files.has("manifest.json")) {
    return;
  }

  const manifestPath = [...files.keys()].find((path) => path.endsWith("/manifest.json"));
  if (!manifestPath) {
    return;
  }

  const prefix = manifestPath.slice(0, -"manifest.json".length);
  const entries = [...files.entries()];
  files.clear();
  for (const [path, data] of entries) {
    files.set(path.startsWith(prefix) ? path.slice(prefix.length) : path, data);
  }
}

export async function createVirtualFileSystemFromZipFile(file: Blob): Promise<PackageVirtualFileSystemResult> {
  return createVirtualFileSystemFromZipBytes(new Uint8Array(await file.arrayBuffer()));
}

export async function createVirtualFileSystemFromDirectoryFiles(files: Iterable<File>): Promise<PackageVirtualFileSystemResult> {
  const selectedFiles = [...files];
  const entries = new Map<string, Uint8Array>();

  for (const file of selectedFiles) {
    const relativePath = file.webkitRelativePath || file.name;
    const normalized = normalizePackagePath(relativePath);
    if (!normalized.ok) {
      return { ok: false, issues: [normalized.issue] };
    }
    entries.set(normalized.path, new Uint8Array(await file.arrayBuffer()));
  }

  resolvePackageRootPrefix(entries);
  return { ok: true, vfs: createVirtualFileSystem(entries) };
}

export async function createVirtualFileSystemFromDirectoryHandle(handle: PackageDirectoryHandle): Promise<PackageVirtualFileSystemResult> {
  const entries = new Map<string, Uint8Array>();
  const visit = async (directory: PackageDirectoryHandle, prefix: string): Promise<PackageIssue | null> => {
    for await (const [name, entry] of directory.entries()) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (entry.kind === "directory") {
        const issue = await visit(entry, path);
        if (issue) return issue;
      } else {
        const normalized = normalizePackagePath(path);
        if (!normalized.ok) return normalized.issue;
        const file = await entry.getFile();
        entries.set(normalized.path, new Uint8Array(await file.arrayBuffer()));
      }
    }
    return null;
  };
  try {
    const issue = await visit(handle, "");
    if (issue) return { ok: false, issues: [issue] };
    return { ok: true, vfs: createVirtualFileSystem(entries) };
  } catch {
    return { ok: false, issues: [{ level: "fatal", code: "DIRECTORY_READ_FAILED", text: "无法读取 Author Preview 开发目录。" }] };
  }
}

export function createVirtualFileSystem(files: Map<string, Uint8Array>): PackageVirtualFileSystem {
  return {
    listFiles() {
      return [...files.keys()].sort();
    },

    readBytes(path) {
      const normalized = normalizePackagePath(path);
      if (!normalized.ok) {
        return { ok: false, issue: normalized.issue };
      }

      const value = files.get(normalized.path);
      if (!value) {
        return {
          ok: false,
          issue: {
            level: "fatal",
            code: "PACKAGE_FILE_MISSING",
            text: `System Package 文件不存在：${normalized.path}`,
            path: normalized.path,
          },
        };
      }

      return { ok: true, path: normalized.path, value };
    },

    readText(path) {
      const read = this.readBytes(path);
      if (!read.ok) {
        return read;
      }

      return { ok: true, path: read.path, value: new TextDecoder().decode(read.value) };
    },
  };
}

function unsafePathIssue(path: string): PackagePathResult {
  return {
    ok: false,
    issue: {
      level: "fatal",
      code: "PACKAGE_PATH_UNSAFE",
      text: `System Package 路径不安全：${path}`,
      path,
    },
  };
}

function resolvePackageRootPrefix(files: Map<string, Uint8Array>): void {
  if (files.has("manifest.json")) return;
  const manifests = [...files.keys()].filter((path) => path.endsWith("/manifest.json"));
  if (manifests.length !== 1) return;
  const prefix = manifests[0].slice(0, -"manifest.json".length);
  const entries = [...files.entries()];
  files.clear();
  for (const [path, data] of entries) {
    files.set(path.startsWith(prefix) ? path.slice(prefix.length) : path, data);
  }
}
