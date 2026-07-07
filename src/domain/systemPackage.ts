import { z } from "zod";

export const frameworkSchemaVersion = "0.1.0";

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

const longTextModuleSchema = z.object({
  ID: z.string().min(1),
  类型: z.literal("longText"),
  标签: z.string().min(1),
  默认值: z.string().optional(),
  行数: z.number().int().min(2).max(20).optional(),
});

const checkboxResourceModuleSchema = z.object({
  ID: z.string().min(1),
  类型: z.literal("checkboxResource"),
  标签: z.string().min(1),
  选项: z
    .array(
      z.object({
        ID: z.string().min(1),
        标签: z.string().min(1),
        默认选中: z.boolean().optional(),
      }),
    )
    .min(1),
});

const countableResourceModuleSchema = z.object({
  ID: z.string().min(1),
  类型: z.literal("countableResource"),
  标签: z.string().min(1),
  最小值: z.number().int().optional(),
  最大值: z.number().int().optional(),
  默认值: z.number().int().optional(),
  步长: z.number().int().positive().optional(),
  最大值可改: z.boolean().optional(),
});

const readOnlyDisplayModuleSchema = z.object({
  ID: z.string().min(1),
  类型: z.literal("readOnlyDisplay"),
  标签: z.string().min(1),
  内容: z.string().min(1).optional(),
  资源ID: z.string().min(1).optional(),
  替代文本: z.string().optional(),
});

const imageFieldModuleSchema = z.object({
  ID: z.string().min(1),
  类型: z.literal("imageField"),
  标签: z.string().min(1),
  替代文本: z.string().optional(),
});

const sheetModuleSchema = z.discriminatedUnion("类型", [
  freeTextModuleSchema,
  longTextModuleSchema,
  checkboxResourceModuleSchema,
  countableResourceModuleSchema,
  readOnlyDisplayModuleSchema,
  imageFieldModuleSchema,
]);

const supportedModuleTypes = new Set([
  "freeText",
  "longText",
  "checkboxResource",
  "countableResource",
  "readOnlyDisplay",
  "imageField",
]);

const cssValueSchema = z.string().min(1);

const layoutStyleSchema = z.object({
  宽度: cssValueSchema.optional(),
  最小宽度: cssValueSchema.optional(),
  最大宽度: cssValueSchema.optional(),
  高度: cssValueSchema.optional(),
  最小高度: cssValueSchema.optional(),
  最大高度: cssValueSchema.optional(),
  间距: cssValueSchema.optional(),
  外边距: cssValueSchema.optional(),
  内边距: cssValueSchema.optional(),
  背景色: cssValueSchema.optional(),
  边框: cssValueSchema.optional(),
  圆角: cssValueSchema.optional(),
  对齐: z.enum(["start", "center", "end", "stretch"]).optional(),
  垂直对齐: z.enum(["start", "center", "end", "stretch"]).optional(),
});

const modulePlacementSchema = z.union([
  z.string().min(1),
  z.object({
    ID: z.string().min(1),
    样式: layoutStyleSchema.optional(),
  }),
]);

const flowColumnSchema = z.object({
  ID: z.string().min(1).optional(),
  宽度: cssValueSchema.optional(),
  最小宽度: cssValueSchema.optional(),
  modules: z.array(modulePlacementSchema).min(1),
  样式: layoutStyleSchema.optional(),
});

const flowRowSchema = z.object({
  ID: z.string().min(1).optional(),
  columns: z.array(flowColumnSchema).min(1),
  样式: layoutStyleSchema.optional(),
});

const sectionSchema = z
  .object({
    ID: z.string().min(1),
    名称: z.string().min(1),
    modules: z.array(z.string().min(1)).min(1).optional(),
    rows: z.array(flowRowSchema).min(1).optional(),
    样式: layoutStyleSchema.optional(),
  })
  .superRefine((section, context) => {
    if (!section.modules && !section.rows) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Section 需要声明 modules 或 rows。",
        path: ["modules"],
      });
    }

    if (section.modules && section.rows) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Section 不能同时声明 modules 和 rows。",
        path: ["rows"],
      });
    }
  });

const pageSchema = z.object({
  ID: z.string().min(1),
  名称: z.string().min(1),
  sections: z.array(sectionSchema).min(1),
  样式: layoutStyleSchema.optional(),
});

const assetSchema = z.object({
  ID: z.string().min(1),
  路径: z.string().min(1),
  类型: z.string().optional(),
});

const systemPackageSchema = z.object({
  manifest: manifestSchema,
  pages: z.array(pageSchema).min(1),
  modules: z.array(sheetModuleSchema).min(1),
  assets: z.array(assetSchema).optional(),
});

const systemPackageEnvelopeSchema = z.object({
  manifest: manifestSchema,
  pages: z.array(pageSchema).min(1),
  modules: z.array(z.unknown()).min(1),
  assets: z.array(assetSchema).optional(),
});

export type SystemPackage = z.infer<typeof systemPackageSchema>;
export type FreeTextModule = z.infer<typeof freeTextModuleSchema>;
export type LongTextModule = z.infer<typeof longTextModuleSchema>;
export type CheckboxResourceModule = z.infer<typeof checkboxResourceModuleSchema>;
export type CountableResourceModule = z.infer<typeof countableResourceModuleSchema>;
export type ReadOnlyDisplayModule = z.infer<typeof readOnlyDisplayModuleSchema>;
export type ImageFieldModule = z.infer<typeof imageFieldModuleSchema>;
export type SheetModule = z.infer<typeof sheetModuleSchema>;
export type PackageAsset = z.infer<typeof assetSchema>;
export type LayoutStyle = z.infer<typeof layoutStyleSchema>;
export type ModulePlacement = z.infer<typeof modulePlacementSchema>;
export type FlowColumn = z.infer<typeof flowColumnSchema>;
export type FlowRow = z.infer<typeof flowRowSchema>;
export type FlowSection = z.infer<typeof sectionSchema>;

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
  const parsed = systemPackageEnvelopeSchema.safeParse(input);

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

  const moduleParseIssues: PackageIssue[] = [];
  const modules: SheetModule[] = [];

  parsed.data.modules.forEach((moduleInput, index) => {
    const moduleType = typeof moduleInput === "object" && moduleInput !== null && "类型" in moduleInput ? (moduleInput as { 类型?: unknown }).类型 : undefined;

    if (typeof moduleType === "string" && !supportedModuleTypes.has(moduleType)) {
      moduleParseIssues.push({
        level: "error",
        code: "UNSUPPORTED_MODULE_TYPE",
        text: `不支持的 Sheet Module 类型：${moduleType}`,
        path: `modules.${index}.类型`,
      });
      return;
    }

    const parsedModule = sheetModuleSchema.safeParse(moduleInput);
    if (!parsedModule.success) {
      moduleParseIssues.push(
        ...parsedModule.error.issues.map((issue) => ({
          level: "fatal" as const,
          code: "PACKAGE_SHAPE_INVALID",
          text: issue.message,
          path: ["modules", index, ...issue.path].join("."),
        })),
      );
      return;
    }

    modules.push(parsedModule.data);
  });

  if (moduleParseIssues.length > 0) {
    return { ok: false, issues: moduleParseIssues };
  }

  const systemPackage: SystemPackage = { ...parsed.data, modules };
  const issues: PackageIssue[] = [];

  if (parsed.data.manifest.schemaVersion !== frameworkSchemaVersion) {
    issues.push({
      level: "warning",
      code: "SCHEMA_VERSION_MISMATCH",
      text: `System Package schemaVersion ${parsed.data.manifest.schemaVersion} 与框架当前版本 ${frameworkSchemaVersion} 不一致,可能存在兼容问题。`,
      path: "manifest.schemaVersion",
    });
  }

  const assetIds = new Set((systemPackage.assets ?? []).map((asset) => asset.ID));
  for (const module of systemPackage.modules) {
    if (module.类型 === "readOnlyDisplay" && !module.内容 && !module.资源ID) {
      issues.push({
        level: "error",
        code: "DISPLAY_CONTENT_MISSING",
        text: "ReadOnly Display 需要 内容 或 资源ID。",
        path: `modules.${module.ID}.内容`,
      });
    }

    if (module.类型 === "readOnlyDisplay" && module.资源ID && !assetIds.has(module.资源ID)) {
      issues.push({
        level: "error",
        code: "MISSING_ASSET_REFERENCE",
        text: `ReadOnly Display 引用了不存在的 Asset：${module.资源ID}`,
        path: `modules.${module.ID}.资源ID`,
      });
    }
  }

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
      for (const moduleId of getSectionModuleReferences(section)) {
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

export function findModule(systemPackage: SystemPackage, moduleId: string): SheetModule | undefined {
  return systemPackage.modules.find((module) => module.ID === moduleId);
}

export function findAsset(systemPackage: SystemPackage, assetId: string): PackageAsset | undefined {
  return systemPackage.assets?.find((asset) => asset.ID === assetId);
}

export function getModulePlacementId(placement: ModulePlacement): string {
  return typeof placement === "string" ? placement : placement.ID;
}

export function getSectionModuleReferences(section: FlowSection): string[] {
  if (section.modules) {
    return section.modules;
  }

  return (section.rows ?? []).flatMap((row) =>
    row.columns.flatMap((column) => column.modules.map((placement) => getModulePlacementId(placement))),
  );
}
