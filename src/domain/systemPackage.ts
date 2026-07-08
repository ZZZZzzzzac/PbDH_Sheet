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

const htmlTemplateLayoutSchema = z.object({
  类型: z.literal("htmlTemplate"),
  html: z.string().min(1),
  css: z.string().min(1).optional(),
  htmlContent: z.string().min(1),
  cssContent: z.string().optional(),
});

const pageSchema = z.object({
  ID: z.string().min(1),
  名称: z.string().min(1),
  layout: htmlTemplateLayoutSchema,
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
export type HtmlTemplateLayout = z.infer<typeof htmlTemplateLayoutSchema>;
export type PackagePage = z.infer<typeof pageSchema>;

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
    const htmlIssues = validateHtmlTemplate(page.layout.htmlContent, `pages.${page.ID}.layout.html`);
    issues.push(...htmlIssues);
    issues.push(...validateTemplateCss(page.layout.cssContent, `pages.${page.ID}.layout.css`));

    for (const moduleId of getHtmlTemplateModuleReferences(page.layout.htmlContent)) {
      if (!moduleIds.has(moduleId)) {
        issues.push({
          level: "error",
          code: "MISSING_MODULE_REFERENCE",
          text: `HTML Layout Template 引用了不存在的 Sheet Module：${moduleId}`,
          path: `pages.${page.ID}.layout.html`,
        });
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

export function getHtmlTemplateModuleReferences(html: string): string[] {
  const matches = html.matchAll(/<pb-module\b[^>]*\bid\s*=\s*["']([^"']+)["'][^>]*>/gi);
  return [...matches].map((match) => match[1]);
}

const forbiddenHtmlTags = new Set(["button", "form", "input", "script", "select", "textarea"]);
const allowedGlobalHtmlAttributes = new Set(["aria-label", "class", "title"]);
const allowedHtmlAttributesByTag = new Map([
  ["img", new Set(["alt", "src"])],
  ["pb-module", new Set(["id"])],
  ["td", new Set(["colspan", "rowspan"])],
  ["th", new Set(["colspan", "rowspan"])],
]);
const allowedHtmlTags = new Set([
  "article",
  "div",
  "em",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "img",
  "li",
  "main",
  "ol",
  "p",
  "pb-module",
  "section",
  "small",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]);

function validateHtmlTemplate(html: string, path: string): PackageIssue[] {
  const issues: PackageIssue[] = [];
  const tagMatches = html.matchAll(/<\/?\s*([a-z][a-z0-9-]*)\b([^>]*)>/gi);

  for (const match of tagMatches) {
    if (match[0].startsWith("</")) {
      continue;
    }

    const tagName = match[1].toLowerCase();
    const attributes = (match[2] ?? "").replace(/\/\s*$/, "");

    if (forbiddenHtmlTags.has(tagName)) {
      issues.push({
        level: "error",
        code: "HTML_TEMPLATE_FORBIDDEN_TAG",
        text: `HTML Layout Template 禁止使用交互或脚本标签：${tagName}`,
        path,
      });
      continue;
    }

    if (!allowedHtmlTags.has(tagName)) {
      issues.push({
        level: "error",
        code: "HTML_TEMPLATE_UNSUPPORTED_TAG",
        text: `HTML Layout Template 不支持标签：${tagName}`,
        path,
      });
    }

    if (/\son[a-z]+\s*=/i.test(attributes)) {
      issues.push({
        level: "error",
        code: "HTML_TEMPLATE_FORBIDDEN_EVENT_HANDLER",
        text: `HTML Layout Template 禁止事件属性：${tagName}`,
        path,
      });
    }

    const attributeIssues = validateHtmlTemplateAttributes(tagName, attributes, path);
    issues.push(...attributeIssues);
  }

  return issues;
}

function validateHtmlTemplateAttributes(tagName: string, attributes: string, path: string): PackageIssue[] {
  const issues: PackageIssue[] = [];
  const tagAttributes = allowedHtmlAttributesByTag.get(tagName);
  const attributeMatches = attributes.matchAll(/\s+([^\s"'=<>`]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g);
  let moduleId: string | undefined;

  for (const match of attributeMatches) {
    const attributeName = match[1].toLowerCase();
    const attributeValue = match[2]?.replace(/^["']|["']$/g, "");

    if (tagName === "pb-module" && attributeName === "id") {
      moduleId = attributeValue;
    }

    const isAllowedAttribute =
      tagAttributes?.has(attributeName) || (tagName !== "pb-module" && (attributeName.startsWith("data-") || allowedGlobalHtmlAttributes.has(attributeName)));

    if (isAllowedAttribute) {
      if (tagName === "img" && attributeName === "src" && attributeValue && isExternalResourceReference(attributeValue)) {
        issues.push({
          level: "error",
          code: "HTML_TEMPLATE_EXTERNAL_RESOURCE",
          text: `HTML Layout Template 禁止外部资源：${attributeValue}`,
          path,
        });
      }
      continue;
    }

    issues.push({
      level: "error",
      code: "HTML_TEMPLATE_UNSUPPORTED_ATTRIBUTE",
      text: `HTML Layout Template 不支持属性：${tagName}.${attributeName}`,
      path,
    });
  }

  if (tagName === "pb-module" && !moduleId) {
    issues.push({
      level: "error",
      code: "HTML_TEMPLATE_MODULE_ID_MISSING",
      text: "HTML Layout Template 的 pb-module 缺少 id 属性。",
      path,
    });
  }

  return issues;
}

function validateTemplateCss(css: string | undefined, path: string): PackageIssue[] {
  if (!css) {
    return [];
  }

  const issues: PackageIssue[] = [];

  if (/@import\b/i.test(css)) {
    issues.push({
      level: "error",
      code: "CSS_TEMPLATE_IMPORT_FORBIDDEN",
      text: "HTML Layout Template CSS 禁止 @import。",
      path,
    });
  }

  const urlMatches = css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi);
  for (const match of urlMatches) {
    const value = (match[1] ?? match[2] ?? match[3] ?? "").trim();

    if (isExternalResourceReference(value)) {
      issues.push({
        level: "error",
        code: "CSS_TEMPLATE_EXTERNAL_RESOURCE",
        text: `HTML Layout Template CSS 禁止外部资源：${value}`,
        path,
      });
    }
  }

  return issues;
}

function isExternalResourceReference(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//") || value.startsWith("/");
}
