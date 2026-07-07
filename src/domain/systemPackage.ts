import { z } from "zod";

const manifestSchema = z.object({
  ID: z.string().min(1),
  名称: z.string().min(1),
  版本: z.string().min(1),
  schemaVersion: z.string().min(1),
});

const freeTextModuleSchema = z.object({
  ID: z.string().min(1),
  类型: z.literal("freeText"),
  标签: z.string().min(1),
  默认值: z.string().optional(),
});

const sectionSchema = z.object({
  ID: z.string().min(1),
  名称: z.string().min(1),
  modules: z.array(z.string().min(1)).min(1),
});

const pageSchema = z.object({
  ID: z.string().min(1),
  名称: z.string().min(1),
  sections: z.array(sectionSchema).min(1),
});

const assetSchema = z.object({
  ID: z.string().min(1),
  路径: z.string().min(1),
  类型: z.string().optional(),
});

const systemPackageSchema = z.object({
  manifest: manifestSchema,
  pages: z.array(pageSchema).min(1),
  modules: z.array(freeTextModuleSchema).min(1),
  assets: z.array(assetSchema).optional(),
});

export type SystemPackage = z.infer<typeof systemPackageSchema>;
export type FreeTextModule = z.infer<typeof freeTextModuleSchema>;

export type PackageIssueLevel = "fatal" | "error" | "warning";

export interface PackageIssue {
  level: PackageIssueLevel;
  code: string;
  text: string;
  path?: string;
}

export type PackageValidationResult =
  | { ok: true; package: SystemPackage; issues: PackageIssue[] }
  | { ok: false; issues: PackageIssue[] };

export function validateSystemPackage(input: unknown): PackageValidationResult {
  const parsed = systemPackageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        level: "fatal",
        code: "PACKAGE_SHAPE_INVALID",
        text: issue.message,
        path: issue.path.join("."),
      })),
    };
  }

  const systemPackage = parsed.data;
  const issues: PackageIssue[] = [];
  const moduleIds = new Set<string>();

  for (const module of systemPackage.modules) {
    if (moduleIds.has(module.ID)) {
      issues.push({
        level: "error",
        code: "DUPLICATE_MODULE_ID",
        text: `Sheet Module ID 重复：${module.ID}`,
        path: `modules.${module.ID}`,
      });
    }
    moduleIds.add(module.ID);
  }

  for (const page of systemPackage.pages) {
    for (const section of page.sections) {
      for (const moduleId of section.modules) {
        if (!moduleIds.has(moduleId)) {
          issues.push({
            level: "error",
            code: "MISSING_MODULE_REFERENCE",
            text: `Section 引用了不存在的 Sheet Module：${moduleId}`,
            path: `pages.${page.ID}.sections.${section.ID}.modules`,
          });
        }
      }
    }
  }

  if (issues.some((issue) => issue.level === "error" || issue.level === "fatal")) {
    return { ok: false, issues };
  }

  return { ok: true, package: systemPackage, issues };
}

export function findModule(systemPackage: SystemPackage, moduleId: string): FreeTextModule | undefined {
  return systemPackage.modules.find((module) => module.ID === moduleId);
}
