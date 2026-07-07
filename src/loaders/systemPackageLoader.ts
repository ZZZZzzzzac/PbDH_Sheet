import { validateSystemPackage, type PackageValidationResult } from "../domain/systemPackage";

export const demoSystemPackageUrl = "/system-packages/demo-minimal.json";

export async function loadSystemPackageFromUrl(
  url: string = demoSystemPackageUrl,
  fetchImpl: typeof fetch = fetch,
): Promise<PackageValidationResult> {
  try {
    const response = await fetchImpl(url);

    if (!response.ok) {
      return {
        ok: false,
        issues: [
          {
            level: "fatal",
            code: "PACKAGE_FETCH_FAILED",
            text: `无法加载 System Package：${response.status} ${response.statusText}`,
            path: url,
          },
        ],
      };
    }

    return validateSystemPackage(await response.json());
  } catch {
    return {
      ok: false,
      issues: [
        {
          level: "fatal",
          code: "PACKAGE_LOAD_FAILED",
          text: "无法加载 System Package JSON。",
          path: url,
        },
      ],
    };
  }
}
