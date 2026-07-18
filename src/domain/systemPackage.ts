import { z } from "zod";
import { parse as parseJavaScript } from "acorn";
import { getCardPresentationFields } from "./cardPresentation";
import { getResourceTextTemplateFields } from "./resourceTextTemplate";
import {
  normalizeResourceLibraries,
  resourceLibraryFieldTemplateSchema,
  resourceLibraryPackageInputSchema,
  resourceLibrarySchema,
  type ResourceLibrary,
} from "./resourceLibrary";
import { isPlainObject } from "../utils";
import {
  characterCreationGuideSchema,
  type CharacterCreationGuide,
} from "./characterCreationGuide";

export const frameworkSchemaVersion = "0.1.0";

const manifestSchema = z.object({
  ID: z.string().min(1),
  名称: z.string().min(1),
  版本: z.string().min(1),
  schemaVersion: z.string().min(1),
});

const sheetModuleBaseSchema = z.object({
  ID: z.string().min(1),
  默认隐藏: z.boolean().optional(),
});

const freeTextModuleSchema = sheetModuleBaseSchema.extend({
  类型: z.literal("freeText"),
  标签: z.string(),
  默认值: z.string().optional(),
  隐藏标签: z.boolean().optional(),
  占位文本: z.string().optional(),
});

const longTextModuleSchema = sheetModuleBaseSchema.extend({
  类型: z.literal("longText"),
  标签: z.string(),
  默认值: z.string().optional(),
  行数: z.number().int().min(2).max(20).optional(),
  隐藏标签: z.boolean().optional(),
  占位文本: z.string().optional(),
});

const checkboxResourceModuleSchema = sheetModuleBaseSchema.extend({
  类型: z.literal("checkboxResource"),
  标签: z.string().min(1),
  选项: z
    .array(
      z.object({
        ID: z.string().min(1),
        标签: z.string().min(1),
        默认选中: z.boolean().optional(),
        分组: z.string().min(1).optional(),
      }),
    )
    .min(1),
});

const countableResourceModuleSchema = sheetModuleBaseSchema.extend({
  类型: z.literal("countableResource"),
  标签: z.string().min(1),
  最小值: z.number().int().optional(),
  最大值: z.number().int().optional(),
  默认值: z.number().int().optional(),
  步长: z.number().int().positive().optional(),
  最大值可改: z.boolean().optional(),
  显示方式: z.enum(["数值", "标记"]).optional(),
  当前值标记: z.string().optional(),
  剩余值标记: z.string().optional(),
}).superRefine((module, context) => {
  if (module.显示方式 !== "标记") return;
  if (module.当前值标记 === undefined) {
    context.addIssue({ code: "custom", path: ["当前值标记"], message: "标记展示需要当前值标记。" });
  } else if (!isSingleVisibleGrapheme(module.当前值标记)) {
    context.addIssue({ code: "custom", path: ["当前值标记"], message: "当前值标记必须是一个可见 Unicode 字素。" });
  }
  if (module.剩余值标记 === undefined) {
    context.addIssue({ code: "custom", path: ["剩余值标记"], message: "标记展示需要剩余值标记。" });
  } else if (!isSingleVisibleGrapheme(module.剩余值标记)) {
    context.addIssue({ code: "custom", path: ["剩余值标记"], message: "剩余值标记必须是一个可见 Unicode 字素。" });
  }
  if (module.当前值标记 !== undefined && module.剩余值标记 !== undefined
    && module.当前值标记.normalize("NFC") === module.剩余值标记.normalize("NFC")) {
    context.addIssue({ code: "custom", path: ["剩余值标记"], message: "当前值标记与剩余值标记必须不同。" });
  }
  if ((module.最小值 ?? 0) < 0) {
    context.addIssue({ code: "custom", path: ["最小值"], message: "标记展示的最小值不能为负数。" });
  }
});

function isSingleVisibleGrapheme(value: string): boolean {
  if (!/[^\p{White_Space}\p{Control}\p{Format}\p{Mark}]/u.test(value)) return false;
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return [...segmenter.segment(value)].length === 1;
}

const readOnlyDisplayModuleSchema = sheetModuleBaseSchema.extend({
  类型: z.literal("readOnlyDisplay"),
  标签: z.string().min(1),
  内容: z.string().min(1).optional(),
  资源路径: z.string().min(1).optional(),
  替代文本: z.string().optional(),
});

const imageFieldModuleSchema = sheetModuleBaseSchema.extend({
  类型: z.literal("imageField"),
  标签: z.string().min(1),
  替代文本: z.string().optional(),
});

const cardPresentationSchema = z.object({
  名称模板: z.string().min(1).optional(),
  描述模板: z.string().min(1).optional(),
  标签字段: z.array(z.string().min(1)).refine((fields) => new Set(fields).size === fields.length, {
    message: "Card Presentation 的标签字段不能重复。",
  }).optional(),
});

const cardTableResourceSourceSchema = z.discriminatedUnion("类型", [
  z.object({ 类型: z.literal("resourceLibrary"), ID: z.string().min(1), 卡牌展示: cardPresentationSchema.optional() }),
  z.object({ 类型: z.literal("resourceComposer"), ID: z.string().min(1), 卡牌展示: cardPresentationSchema.optional() }),
  z.object({ 类型: z.literal("otherResourceLibraries"), ID: z.literal("其他"), 卡牌展示: cardPresentationSchema.optional() }),
]);

const cardTableModuleSchema = sheetModuleBaseSchema.extend({
  类型: z.literal("cardTable"),
  标签: z.string().min(1),
  资源来源: z.array(cardTableResourceSourceSchema).min(1).refine((sources) => new Set(sources.map((source) => `${source.类型}:${source.ID}`)).size === sources.length, {
    message: "Card Table 的资源来源不能重复。",
  }),
  状态选项: z.array(z.string().min(1)).min(1).refine((states) => new Set(states).size === states.length, {
    message: "Card Table 的状态选项不能重复。",
  }).optional(),
  状态背景色: z.record(
    z.string().min(1),
    z.string().regex(/^#[0-9a-fA-F]{6}$/, "Card state 背景色必须是 #RRGGBB 六位十六进制颜色。"),
  ).optional(),
  显示方式: z.enum(["image", "text"]).optional(),
  卡图字段: z.string().min(1).optional(),
  卡背字段: z.string().min(1).optional(),
  显示方式字段: z.string().min(1).optional(),
  背面卡牌ID字段: z.string().min(1).optional(),
});

const resourcePickerQuerySchema = z.object({
  filters: z.record(z.string(), z.array(z.string())).optional(),
  sort: z
    .object({
      field: z.string().min(1),
      direction: z.enum(["asc", "desc"]).optional(),
    })
    .optional(),
});

const resourcePickerModuleSchema = sheetModuleBaseSchema.extend({
  类型: z.literal("resourcePicker"),
  按钮文本: z.string().min(1),
  资源库: z.union([
    z.array(z.object({
      ID: z.string().min(1),
      字段模板: z.array(resourceLibraryFieldTemplateSchema).optional(),
      默认查询: resourcePickerQuerySchema.optional(),
    })).min(1).refine((links) => new Set(links.map((link) => link.ID)).size === links.length, { message: "Resource Picker 的 Resource Library 链接不能重复。" }),
    z.literal("其他"),
  ]),
  多选: z.boolean().optional(),
  创建卡牌: z
    .object({
      卡牌桌面模块ID: z.string().min(1),
      默认状态: z.string().min(1).optional(),
    })
    .optional(),
});

const resourceComposerModuleSchema = sheetModuleBaseSchema.extend({
  类型: z.literal("resourceComposer"),
  按钮文本: z.string().min(1),
  来源槽位: z.array(z.object({
    ID: z.string().min(1),
    标签: z.string().min(1),
    资源库ID: z.string().min(1),
    字段模板: z.array(resourceLibraryFieldTemplateSchema).optional(),
  }))
    .min(1).refine((slots) => new Set(slots.map((slot) => slot.ID)).size === slots.length, { message: "Resource Composer 的来源槽位 ID 不能重复。" }),
  输出字段: z.array(z.object({
    字段: z.string().min(1).refine((field) => field !== "ID", { message: "Composite Resource ID 由框架生成。" }),
    来源槽位ID: z.string().min(1),
    来源字段: z.string().min(1),
  })).min(1).refine((mappings) => new Set(mappings.map((mapping) => mapping.字段)).size === mappings.length, { message: "Resource Composer 的输出字段不能重复。" }),
  选择关系输出: z.object({
    字段: z.string().min(1).refine((field) => field !== "ID", { message: "Composite Resource ID 由框架生成。" }),
    全部相同时: z.string().min(1),
    不全相同时: z.string().min(1),
  }).optional(),
  创建卡牌: z.object({ 卡牌桌面模块ID: z.string().min(1), 默认状态: z.string().min(1).optional() }).optional(),
});

const dependencySourceSchema = z.discriminatedUnion("类型", [
  z.object({
    类型: z.literal("resourcePicker"),
    模块ID: z.string().min(1),
  }),
  z.object({
    类型: z.literal("resourceComposer"),
    模块ID: z.string().min(1),
  }),
  z.object({
    类型: z.literal("checkboxResource"),
    模块ID: z.string().min(1),
  }),
]);

const dependencyTargetSchema = z.discriminatedUnion("类型", [
  z.object({
    类型: z.literal("module"),
    模块ID: z.string().min(1),
  }),
  z.object({
    类型: z.literal("page"),
    页面ID: z.string().min(1),
  }),
]);

const dependencyTriggerSchema = z.discriminatedUnion("类型", [
  z.object({
    类型: z.literal("resourceSelected"),
    来源模块ID: z.string().min(1),
  }),
  z.object({
    类型: z.literal("checkboxChanged"),
    来源模块ID: z.string().min(1),
  }),
]);

const dependencyConditionSchema = z.discriminatedUnion("类型", [
  z.object({
    类型: z.literal("always"),
  }),
  z.object({
    类型: z.literal("selectedResourceFieldEquals"),
    字段: z.string().min(1),
    值: z.string(),
  }),
  z.object({
    类型: z.literal("selectedResourceFieldIn"),
    字段: z.string().min(1),
    值: z.array(z.string()).min(1),
  }),
  z.object({
    类型: z.literal("selectedResourceFieldNotEquals"),
    字段: z.string().min(1),
    值: z.string(),
  }),
  z.object({
    类型: z.literal("checkboxOptionChecked"),
    选项ID: z.string().min(1),
  }),
  z.object({
    类型: z.literal("checkboxOptionUnchecked"),
    选项ID: z.string().min(1),
  }),
]);

const fillTextContentSchema = z.union([
  z.string(),
  z.object({
    类型: z.literal("selectedResourceField"),
    字段: z.string().min(1),
    选择索引: z.number().int().min(0).optional(),
    分隔符: z.string().optional(),
  }),
  z.object({
    类型: z.literal("selectedResourceTemplate"),
    格式: z.string().min(1),
    选择索引: z.number().int().min(0).optional(),
    分隔符: z.string().optional(),
  }),
]);

const fillCountableContentSchema = z.union([
  z.number().int(),
  z.object({
    类型: z.literal("selectedResourceField"),
    字段: z.string().min(1),
    选择索引: z.number().int().min(0).optional(),
  }),
]);

const fillCountableActionSchema = z.object({
  类型: z.literal("fillCountable"),
  目标模块ID: z.string().min(1),
  当前值: fillCountableContentSchema.optional(),
  最大值: z.union([fillCountableContentSchema, z.null()]).optional(),
}).refine((action) => action.当前值 !== undefined || action.最大值 !== undefined, {
  message: "fillCountable 至少需要 当前值 或 最大值。",
});

const dependencyActionSchema = z.discriminatedUnion("类型", [
  z.object({
    类型: z.literal("fillText"),
    目标模块ID: z.string().min(1),
    内容: fillTextContentSchema,
    写入方式: z.enum(["替换", "追加"]).optional(),
    追加分隔符: z.string().optional(),
  }),
  fillCountableActionSchema,
  z.object({
    类型: z.literal("setVisibility"),
    目标类型: z.enum(["page", "module"]),
    目标ID: z.string().min(1),
    显示: z.boolean(),
  }),
  z.object({
    类型: z.literal("setResourceDefaultFilter"),
    目标模块ID: z.string().min(1),
    字段: z.string().min(1),
    值: z.union([
      z.array(z.string()).min(1),
      z.object({
        类型: z.literal("selectedResourceField"),
        字段: z.string().min(1),
        选择索引: z.number().int().min(0).optional(),
      }),
    ]),
  }),
]);

const dependencyRuleSchema = z.object({
  ID: z.string().min(1),
  sources: z.array(dependencySourceSchema).min(1),
  targets: z.array(dependencyTargetSchema).min(1),
  触发: dependencyTriggerSchema,
  条件: dependencyConditionSchema.optional(),
  动作: z.array(dependencyActionSchema).min(1),
});

const sheetModuleSchema = z.discriminatedUnion("类型", [
  freeTextModuleSchema,
  longTextModuleSchema,
  checkboxResourceModuleSchema,
  countableResourceModuleSchema,
  readOnlyDisplayModuleSchema,
  imageFieldModuleSchema,
  cardTableModuleSchema,
  resourcePickerModuleSchema,
  resourceComposerModuleSchema,
]);

const supportedModuleTypes: Set<string> = new Set(
  sheetModuleSchema.options.map((option) => option.shape["类型"].value),
);

const htmlTemplateLayoutSchema = z.object({
  类型: z.literal("htmlTemplate"),
  htmlContent: z.string().min(1),
  cssContent: z.string().optional(),
});

const skinLayoutOverridesSchema = z.object({
  shell: z.object({ htmlContent: z.string().min(1) }).optional(),
  pages: z.array(z.object({ ID: z.string().min(1), htmlContent: z.string().min(1) })).min(1).optional(),
});

const systemPackageSkinSchema = z.object({
  ID: z.string().min(1),
  名称: z.string().min(1),
  cssContent: z.string().min(1),
  推荐框架配色: z.enum(["light", "dark"]),
  layoutOverrides: skinLayoutOverridesSchema.optional(),
});

const pageSchema = z.object({
  ID: z.string().min(1),
  名称: z.string().min(1),
  默认隐藏: z.boolean().optional(),
  打印: z.boolean().optional(),
  layout: htmlTemplateLayoutSchema,
});

const assetSchema = z.object({
  路径: z.string().min(1),
  类型: z.string().optional(),
});

const validationCheckSchema = z.object({
  ID: z.string().min(1),
  脚本: z.string().min(1),
  scriptContent: z.string().min(1),
});

const systemPackageEnvelopeSchema = z.object({
  manifest: manifestSchema,
  shell: htmlTemplateLayoutSchema.optional(),
  skins: z.array(systemPackageSkinSchema).min(1).optional(),
  defaultSkin: z.string().min(1).optional(),
  pages: z.array(pageSchema).min(1),
  modules: z.array(z.unknown()).min(1),
  assets: z.array(assetSchema).optional(),
  resourceLibraries: z.array(resourceLibraryPackageInputSchema).optional(),
  dependencies: z.array(z.unknown()).optional(),
  validationChecks: z.array(validationCheckSchema).optional(),
  characterCreationGuide: z.unknown().optional(),
});

export interface SystemPackage {
  manifest: z.infer<typeof manifestSchema>;
  shell?: HtmlTemplateLayout;
  skins?: SystemPackageSkin[];
  defaultSkin?: string;
  pages: PackagePage[];
  modules: SheetModule[];
  assets?: PackageAsset[];
  resourceLibraries?: ResourceLibrary[];
  dependencies?: DependencyRule[];
  validationChecks?: ValidationCheck[];
  characterCreationGuide?: CharacterCreationGuide;
}
export type FreeTextModule = z.infer<typeof freeTextModuleSchema>;
export type LongTextModule = z.infer<typeof longTextModuleSchema>;
export type CheckboxResourceModule = z.infer<typeof checkboxResourceModuleSchema>;
export type CountableResourceModule = z.infer<typeof countableResourceModuleSchema>;
export type ReadOnlyDisplayModule = z.infer<typeof readOnlyDisplayModuleSchema>;
export type ImageFieldModule = z.infer<typeof imageFieldModuleSchema>;
export type CardTableModule = z.infer<typeof cardTableModuleSchema>;
export type CardTableResourceSource = z.infer<typeof cardTableResourceSourceSchema>;
export type ResourcePickerModule = z.infer<typeof resourcePickerModuleSchema>;
export type ResourceComposerModule = z.infer<typeof resourceComposerModuleSchema>;
export type SheetModule = z.infer<typeof sheetModuleSchema>;
export type PackageAsset = z.infer<typeof assetSchema>;
export type HtmlTemplateLayout = z.infer<typeof htmlTemplateLayoutSchema>;
export type SystemPackageSkin = z.infer<typeof systemPackageSkinSchema>;
export type PackagePage = z.infer<typeof pageSchema>;
export type DependencyRule = z.infer<typeof dependencyRuleSchema>;
export type DependencySource = z.infer<typeof dependencySourceSchema>;
export type DependencyTarget = z.infer<typeof dependencyTargetSchema>;
export type DependencyTrigger = z.infer<typeof dependencyTriggerSchema>;
export type DependencyCondition = z.infer<typeof dependencyConditionSchema>;
export type DependencyAction = z.infer<typeof dependencyActionSchema>;
export type ValidationCheck = z.infer<typeof validationCheckSchema>;
export type { ResourceLibrary };

export type PackageIssueLevel = "fatal" | "error" | "warning" | "info" | "debug";

export interface PackageIssueLocation {
  pointer: Array<string | number>;
  file?: string;
  line?: number;
  column?: number;
}

export interface PackageIssueEntity {
  kind: "manifest" | "page" | "module" | "asset" | "resourceLibrary" | "resourceEntry" | "dependency" | "validationCheck" | "guideStep";
  id?: string;
  index?: number;
}

export interface PackageIssueEvidence {
  label: string;
  value: unknown;
}

export type PackageSourceMap = Record<string, string>;

export interface PackageIssue {
  level: PackageIssueLevel;
  code: string;
  text: string;
  path?: string;
  location?: PackageIssueLocation;
  entities?: PackageIssueEntity[];
  evidence?: PackageIssueEvidence[];
}

export type PackageValidationResult =
  | { ok: true; package: SystemPackage; issues: PackageIssue[] }
  | { ok: false; issues: PackageIssue[] };

export type CachedPackageValidationResult =
  | { ok: true; package: SystemPackage }
  | { ok: false; issues: PackageIssue[] };

type DependencyParseResult =
  | { ok: true; dependencies: DependencyRule[] }
  | { ok: false; issues: PackageIssue[] };

type GuideParseResult =
  | { ok: true; guide?: CharacterCreationGuide }
  | { ok: false; issues: PackageIssue[] };

function parseCharacterCreationGuide(input: unknown): GuideParseResult {
  if (input === undefined) {
    return { ok: true };
  }

  const parsed = characterCreationGuideSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        level: "error",
        code: "INVALID_CHARACTER_CREATION_GUIDE",
        text: issue.message,
        path: ["characterCreationGuide", ...issue.path].join("."),
      })),
    };
  }

  return { ok: true, guide: parsed.data };
}

function parseDependencyRules(inputs: unknown[]): DependencyParseResult {
  const dependencies: DependencyRule[] = [];
  const issues: PackageIssue[] = [];

  inputs.forEach((input, index) => {
    const unsupportedIssue = detectUnsupportedDependencySource(input, index);
    if (unsupportedIssue) {
      issues.push(unsupportedIssue);
      return;
    }

    const parsedDependency = dependencyRuleSchema.safeParse(input);
    if (!parsedDependency.success) {
      issues.push(
        ...parsedDependency.error.issues.map((issue) => ({
          level: "fatal" as const,
          code: "PACKAGE_SHAPE_INVALID",
          text: issue.message,
          path: ["dependencies", index, ...issue.path].join("."),
        })),
      );
      return;
    }

    dependencies.push(parsedDependency.data);
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, dependencies };
}

function detectUnsupportedDependencySource(input: unknown, index: number): PackageIssue | undefined {
  if (!isPlainObject(input)) {
    return undefined;
  }

  const trigger = isPlainObject(input.触发) ? input.触发 : undefined;
  if (isUnsupportedCounterType(trigger?.类型)) {
    return {
      level: "error",
      code: "UNSUPPORTED_DEPENDENCY_TRIGGER",
      text: "Dependency Logic v1 不支持 countableResource/counter 触发源。",
      path: `dependencies.${index}.触发.类型`,
    };
  }

  if (Array.isArray(input.sources)) {
    const sourceIndex = input.sources.findIndex((source) => isPlainObject(source) && isUnsupportedCounterType(source.类型));
    if (sourceIndex !== -1) {
      return {
        level: "error",
        code: "UNSUPPORTED_DEPENDENCY_SOURCE_MODULE",
        text: "Dependency Logic v1 不支持 countableResource/counter 触发源。",
        path: `dependencies.${index}.sources.${sourceIndex}.类型`,
      };
    }
  }

  return undefined;
}

function isUnsupportedCounterType(value: unknown): boolean {
  return value === "countableResource" || value === "countableChanged" || value === "counter" || value === "counterChanged";
}

export function validateSystemPackage(input: unknown, sourceMap: PackageSourceMap = {}): PackageValidationResult {
  const result = validateSystemPackageCore(input);
  return { ...result, issues: result.issues.map((issue) => normalizePackageIssue(issue, sourceMap)) };
}

function validateSystemPackageCore(input: unknown): PackageValidationResult {
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

  const parsedDependencies = parseDependencyRules(parsed.data.dependencies ?? []);
  if (!parsedDependencies.ok) {
    return { ok: false, issues: parsedDependencies.issues };
  }

  const parsedGuide = parseCharacterCreationGuide(parsed.data.characterCreationGuide);
  if (!parsedGuide.ok) {
    return { ok: false, issues: parsedGuide.issues };
  }

  const normalizedResourceLibraries = normalizeResourceLibraries(parsed.data.resourceLibraries ?? []);
  if (!normalizedResourceLibraries.ok) {
    return { ok: false, issues: normalizedResourceLibraries.issues };
  }

  const {
    assets: rawAssets,
    resourceLibraries: _rawResourceLibraries,
    dependencies: _rawDependencies,
    characterCreationGuide: _rawGuide,
    ...packageData
  } = parsed.data;
  const systemPackage: SystemPackage = {
    ...packageData,
    modules,
    ...(rawAssets && rawAssets.length > 0 ? { assets: rawAssets } : {}),
    ...(parsedDependencies.dependencies.length > 0 ? { dependencies: parsedDependencies.dependencies } : {}),
    ...(normalizedResourceLibraries.resourceLibraries.length > 0 ? { resourceLibraries: normalizedResourceLibraries.resourceLibraries } : {}),
    ...(parsedGuide.guide ? { characterCreationGuide: parsedGuide.guide } : {}),
  };
  const issues: PackageIssue[] = [];

  collectDuplicateIdIssues(systemPackage.pages, "Page", "DUPLICATE_PAGE_ID", "pages", issues);
  collectDuplicateIdIssues(systemPackage.skins ?? [], "Skin", "DUPLICATE_SKIN_ID", "skins", issues);
  collectDuplicateIdIssues(
    systemPackage.validationChecks ?? [],
    "Validation Check",
    "DUPLICATE_VALIDATION_CHECK_ID",
    "validationChecks",
    issues,
  );

  if (parsed.data.manifest.schemaVersion !== frameworkSchemaVersion) {
    issues.push({
      level: "warning",
      code: "SCHEMA_VERSION_MISMATCH",
      text: `System Package schemaVersion ${parsed.data.manifest.schemaVersion} 与框架当前版本 ${frameworkSchemaVersion} 不一致,可能存在兼容问题。`,
      path: "manifest.schemaVersion",
    });
  }

  const assetRefs = new Set((systemPackage.assets ?? []).map((asset) => asset.路径));
  const usedAssetRefs = new Set<string>();

  if (systemPackage.skins?.length) {
    if (!systemPackage.defaultSkin || !systemPackage.skins.some((skin) => skin.ID === systemPackage.defaultSkin)) {
      issues.push({
        level: "error",
        code: "MISSING_DEFAULT_SKIN_REFERENCE",
        text: `默认 Skin 不存在：${systemPackage.defaultSkin ?? "未声明"}`,
        path: "defaultSkin",
      });
    }

    for (const skin of systemPackage.skins) {
      const path = `skins.${skin.ID}.css`;
      issues.push(...validateTemplateCss(skin.cssContent, path));
      collectTemplateImageReferences("", skin.cssContent).forEach((assetPath) => {
        usedAssetRefs.add(assetPath);
        if (!assetRefs.has(assetPath)) {
          issues.push({
            level: "error",
            code: "MISSING_TEMPLATE_IMAGE_REFERENCE",
            text: `System Package Skin 引用了不存在的图片：${assetPath}`,
            path,
          });
        }
      });
      validateSkinLayoutOverrides(systemPackage, skin, assetRefs, usedAssetRefs, issues);
    }
  } else if (systemPackage.defaultSkin) {
    issues.push({
      level: "error",
      code: "MISSING_DEFAULT_SKIN_REFERENCE",
      text: `默认 Skin 不存在：${systemPackage.defaultSkin}`,
      path: "defaultSkin",
    });
  }
  for (const module of systemPackage.modules) {
    if (module.类型 === "readOnlyDisplay" && !module.内容 && !module.资源路径) {
      issues.push({
        level: "error",
        code: "DISPLAY_CONTENT_MISSING",
        text: "ReadOnly Display 需要 内容 或 资源路径。",
        path: `modules.${module.ID}.内容`,
      });
    }

    if (module.类型 === "readOnlyDisplay" && module.资源路径 && !assetRefs.has(module.资源路径)) {
      issues.push({
        level: "error",
        code: "MISSING_ASSET_REFERENCE",
        text: `ReadOnly Display 引用了不存在的图片：${module.资源路径}`,
        path: `modules.${module.ID}.资源路径`,
      });
    }

    if (module.类型 === "resourcePicker" && module.资源库 !== "其他") {
      module.资源库.forEach((link, linkIndex) => {
        if (findResourceLibrary(systemPackage, link.ID)) return;
        issues.push({
          level: "error",
          code: "MISSING_RESOURCE_LIBRARY_REFERENCE",
          text: `Resource Picker 引用了不存在的 Resource Library：${link.ID}`,
          path: `modules.${module.ID}.资源库.${linkIndex}.ID`,
        });
      });
    }
    if (module.类型 === "readOnlyDisplay" && module.资源路径) {
      usedAssetRefs.add(module.资源路径);
    }

    if (module.类型 === "resourceComposer") {
      const slotById = new Map(module.来源槽位.map((slot) => [slot.ID, slot]));
      module.来源槽位.forEach((slot, slotIndex) => {
        if (findResourceLibrary(systemPackage, slot.资源库ID)) return;
        issues.push({
          level: "error",
          code: "MISSING_RESOURCE_LIBRARY_REFERENCE",
          text: `Resource Composer 引用了不存在的 Resource Library：${slot.资源库ID}`,
          path: `modules.${module.ID}.来源槽位.${slotIndex}.资源库ID`,
        });
      });
      module.输出字段.forEach((mapping, mappingIndex) => {
        const slot = slotById.get(mapping.来源槽位ID);
        if (!slot) {
          issues.push({
            level: "error",
            code: "MISSING_RESOURCE_COMPOSER_SLOT_REFERENCE",
            text: `Resource Composer 输出字段引用了不存在的来源槽位：${mapping.来源槽位ID}`,
            path: `modules.${module.ID}.输出字段.${mappingIndex}.来源槽位ID`,
          });
          return;
        }
        validateResourceLibraryField(findResourceLibrary(systemPackage, slot.资源库ID), mapping.来源字段, `modules.${module.ID}.输出字段.${mappingIndex}.来源字段`, module.ID, module.ID, issues);
      });
      if (module.选择关系输出 && module.输出字段.some((mapping) => mapping.字段 === module.选择关系输出?.字段)) {
        issues.push({
          level: "error",
          code: "DUPLICATE_RESOURCE_COMPOSER_OUTPUT_FIELD",
          text: `Resource Composer 的选择关系输出字段与普通输出字段重复：${module.选择关系输出.字段}`,
          path: `modules.${module.ID}.选择关系输出.字段`,
        });
      }
    }

    if (module.类型 === "cardTable") {
      module.资源来源.forEach((source, sourceIndex) => {
        const exists = source.类型 === "resourceLibrary"
          ? Boolean(findResourceLibrary(systemPackage, source.ID))
          : source.类型 === "resourceComposer"
            ? systemPackage.modules.some((candidate) => candidate.类型 === "resourceComposer" && candidate.ID === source.ID)
            : systemPackage.modules.some((candidate) => candidate.类型 === "resourcePicker" && candidate.资源库 === "其他");
        if (!exists) {
          issues.push({
            level: "error",
            code: source.类型 === "resourceLibrary" ? "MISSING_RESOURCE_LIBRARY_REFERENCE" : source.类型 === "resourceComposer" ? "MISSING_RESOURCE_COMPOSER_REFERENCE" : "MISSING_OTHER_RESOURCES_PICKER_REFERENCE",
            text: `Card Table 引用了不存在的 ${source.类型}：${source.ID}`,
            path: `modules.${module.ID}.资源来源.${sourceIndex}.ID`,
          });
        }
        if (source.类型 === "resourceComposer" && source.卡牌展示) {
          const composer = systemPackage.modules.find((candidate) => candidate.类型 === "resourceComposer" && candidate.ID === source.ID);
          const knownFields = new Set([
            "ID",
            ...(composer?.类型 === "resourceComposer" ? composer.输出字段.map((mapping) => mapping.字段) : []),
            ...(composer?.类型 === "resourceComposer" && composer.选择关系输出 ? [composer.选择关系输出.字段] : []),
          ]);
          for (const field of getCardPresentationFields(source.卡牌展示)) {
            if (knownFields.has(field)) continue;
            issues.push({
              level: "error",
              code: "MISSING_RESOURCE_FIELD_REFERENCE",
              text: `Card Presentation 引用了 Resource Composer 中不存在的输出字段：${field}`,
              path: `modules.${module.ID}.资源来源.${sourceIndex}.卡牌展示`,
              evidence: [{ label: "referencedField", value: field }, { label: "knownFields", value: [...knownFields] }],
            });
          }
        }
      });
      const stateOptions = module.状态选项 ?? [];
      for (const state of Object.keys(module.状态背景色 ?? {})) {
        if (!stateOptions.includes(state)) {
          issues.push({
            level: "error",
            code: "CARD_STATE_COLOR_UNKNOWN_STATE",
            text: `Card state 背景色引用了状态选项中不存在的 state：${state}`,
            path: `modules.${module.ID}.状态背景色.${state}`,
          });
        }
      }
    }
    if (module.类型 === "checkboxResource") {
      collectDuplicateIdIssues(module.选项, "Checkbox Resource option", "DUPLICATE_CHECKBOX_OPTION_ID", `modules.${module.ID}.选项`, issues);
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

  const otherResourcePickers = systemPackage.modules.filter((module) => module.类型 === "resourcePicker" && module.资源库 === "其他");
  otherResourcePickers.slice(1).forEach((module) => issues.push({
    level: "error",
    code: "DUPLICATE_OTHER_RESOURCE_PICKER",
    text: "一个 System Package 最多声明一个 Other Resources Picker。",
    path: `modules.${module.ID}.资源库`,
  }));

  const moduleById = new Map(systemPackage.modules.map((module) => [module.ID, module]));
  const pageById = new Map(systemPackage.pages.map((page) => [page.ID, page]));
  const guideRegions = [
    ...systemPackage.pages.flatMap((page) =>
      getHtmlTemplateGuideRegionIds(page.layout.htmlContent).map((id) => ({ id, path: `pages.${page.ID}.layout.html` }))),
    ...(systemPackage.shell
      ? getHtmlTemplateGuideRegionIds(systemPackage.shell.htmlContent).map((id) => ({ id, path: "shell.html" }))
      : []),
  ];
  const guideRegionIds = new Set<string>();
  for (const region of guideRegions) {
    if (guideRegionIds.has(region.id)) {
      issues.push({
        level: "error",
        code: "DUPLICATE_GUIDE_REGION_ID",
        text: `Layout Region ID 重复：${region.id}`,
        path: region.path,
      });
    }
    guideRegionIds.add(region.id);
  }

  const guideStepIds = new Set<string>();
  for (const [stepIndex, step] of (systemPackage.characterCreationGuide?.步骤 ?? []).entries()) {
    if (guideStepIds.has(step.ID)) {
      issues.push({
        level: "error",
        code: "DUPLICATE_GUIDE_STEP_ID",
        text: `Guide Step ID 重复：${step.ID}`,
        path: `characterCreationGuide.步骤.${stepIndex}.ID`,
      });
    }
    guideStepIds.add(step.ID);

    if (step.目标?.类型 === "module" && !moduleById.has(step.目标.模块ID)) {
      issues.push({
        level: "error",
        code: "MISSING_GUIDE_TARGET_MODULE",
        text: `Guide Step 引用了不存在的 Sheet Module：${step.目标.模块ID}`,
        path: `characterCreationGuide.步骤.${stepIndex}.目标.模块ID`,
      });
    }

    if (step.目标?.类型 === "page" && !pageById.has(step.目标.页面ID)) {
      issues.push({
        level: "error",
        code: "MISSING_GUIDE_TARGET_PAGE",
        text: `Guide Step 引用了不存在的页面：${step.目标.页面ID}`,
        path: `characterCreationGuide.步骤.${stepIndex}.目标.页面ID`,
      });
    }

    if (step.目标?.类型 === "region" && !guideRegionIds.has(step.目标.区域ID)) {
      issues.push({
        level: "error",
        code: "MISSING_GUIDE_TARGET_REGION",
        text: `Guide Step 引用了不存在的 Layout Region：${step.目标.区域ID}`,
        path: `characterCreationGuide.步骤.${stepIndex}.目标.区域ID`,
      });
    }
  }
  const dependencyIds = new Set<string>();

  for (const dependency of systemPackage.dependencies ?? []) {
    if (dependencyIds.has(dependency.ID)) {
      issues.push({
        level: "error",
        code: "DUPLICATE_DEPENDENCY_ID",
        text: `Dependency Rule ID 重复：${dependency.ID}`,
        path: `dependencies.${dependency.ID}`,
      });
    }
    dependencyIds.add(dependency.ID);

    dependency.sources.forEach((source, sourceIndex) => {
      const sourceModule = moduleById.get(source.模块ID);
      if (!sourceModule) {
        issues.push({
          level: "error",
          code: "MISSING_DEPENDENCY_SOURCE_MODULE",
          text: `Dependency Rule sources 引用了不存在的模块：${source.模块ID}`,
          path: `dependencies.${dependency.ID}.sources.${sourceIndex}.模块ID`,
        });
        return;
      }

      if (sourceModule.类型 !== source.类型) {
        issues.push({
          level: "error",
          code: "UNSUPPORTED_DEPENDENCY_SOURCE_MODULE",
          text: `Dependency Rule source 类型与模块类型不匹配：${source.模块ID}`,
          path: `dependencies.${dependency.ID}.sources.${sourceIndex}.类型`,
        });
      }
    });

    dependency.targets.forEach((target, targetIndex) => {
      if (target.类型 === "module" && !moduleById.has(target.模块ID)) {
        issues.push({
          level: "error",
          code: "MISSING_DEPENDENCY_TARGET_MODULE",
          text: `Dependency Rule targets 引用了不存在的模块：${target.模块ID}`,
          path: `dependencies.${dependency.ID}.targets.${targetIndex}.模块ID`,
        });
      }

      if (target.类型 === "page" && !pageById.has(target.页面ID)) {
        issues.push({
          level: "error",
          code: "MISSING_DEPENDENCY_TARGET_PAGE",
          text: `Dependency Rule targets 引用了不存在的页面：${target.页面ID}`,
          path: `dependencies.${dependency.ID}.targets.${targetIndex}.页面ID`,
        });
      }
    });

    const sourceModule = moduleById.get(dependency.触发.来源模块ID);
    if (!sourceModule) {
      issues.push({
        level: "error",
        code: "MISSING_DEPENDENCY_SOURCE_MODULE",
        text: `Dependency Rule 引用了不存在的来源模块：${dependency.触发.来源模块ID}`,
        path: `dependencies.${dependency.ID}.触发.来源模块ID`,
      });
    } else if (dependency.触发.类型 === "resourceSelected" && sourceModule.类型 !== "resourcePicker" && sourceModule.类型 !== "resourceComposer") {
      issues.push({
        level: "error",
        code: "UNSUPPORTED_DEPENDENCY_SOURCE_MODULE",
        text: `resourceSelected 触发源必须是 Resource Picker 或 Resource Composer：${dependency.触发.来源模块ID}`,
        path: `dependencies.${dependency.ID}.触发.来源模块ID`,
      });
    } else if (dependency.触发.类型 === "checkboxChanged" && sourceModule.类型 !== "checkboxResource") {
      issues.push({
        level: "error",
        code: "UNSUPPORTED_DEPENDENCY_SOURCE_MODULE",
        text: `checkboxChanged 触发源必须是 Checkbox Resource：${dependency.触发.来源模块ID}`,
        path: `dependencies.${dependency.ID}.触发.来源模块ID`,
      });
    }

    const hasDeclaredTriggerSource = dependency.sources.some((source) => source.模块ID === dependency.触发.来源模块ID);
    if (!hasDeclaredTriggerSource) {
      issues.push({
        level: "error",
        code: "MISSING_DEPENDENCY_TRIGGER_SOURCE_DECLARATION",
        text: `Dependency Rule sources 必须声明触发来源模块：${dependency.触发.来源模块ID}`,
        path: `dependencies.${dependency.ID}.sources`,
      });
    }

    if (isResourceCondition(dependency.条件) && dependency.触发.类型 !== "resourceSelected") {
      issues.push({
        level: "error",
        code: "UNSUPPORTED_DEPENDENCY_CONDITION",
        text: `selectedResourceField 条件只能用于 resourceSelected 触发：${dependency.ID}`,
        path: `dependencies.${dependency.ID}.条件.类型`,
      });
    }

    if (isResourceCondition(dependency.条件)) {
      validateSelectedResourceField(systemPackage, sourceModule, dependency.条件.字段, `dependencies.${dependency.ID}.条件.字段`, dependency.ID, issues);
    }

    if (isCheckboxCondition(dependency.条件) && dependency.触发.类型 !== "checkboxChanged") {
      issues.push({
        level: "error",
        code: "UNSUPPORTED_DEPENDENCY_CONDITION",
        text: `checkbox option 条件只能用于 checkboxChanged 触发：${dependency.ID}`,
        path: `dependencies.${dependency.ID}.条件.类型`,
      });
    }
    const checkboxCondition = isCheckboxCondition(dependency.条件) ? dependency.条件 : undefined;
    if (checkboxCondition && sourceModule?.类型 === "checkboxResource" && !sourceModule.选项.some((option) => option.ID === checkboxCondition.选项ID)) {
      issues.push({
        level: "error",
        code: "MISSING_CHECKBOX_OPTION_REFERENCE",
        text: `Dependency Rule ${dependency.ID} 引用了 Checkbox Resource ${sourceModule.ID} 中不存在的选项 ${checkboxCondition.选项ID}`,
        path: `dependencies.${dependency.ID}.条件.选项ID`,
        evidence: [{ label: "referencedOptionId", value: checkboxCondition.选项ID }, { label: "knownOptionIds", value: sourceModule.选项.map((option) => option.ID) }],
      });
    }

    dependency.动作.forEach((action, actionIndex) => {
      if (action.类型 === "fillText") {
        const targetModule = moduleById.get(action.目标模块ID);
        if (!targetModule) {
          issues.push({
            level: "error",
            code: "MISSING_DEPENDENCY_TARGET_MODULE",
            text: `Dependency Rule 引用了不存在的目标模块：${action.目标模块ID}`,
            path: `dependencies.${dependency.ID}.动作.${actionIndex}.目标模块ID`,
          });
          return;
        }

        if (targetModule.类型 !== "freeText" && targetModule.类型 !== "longText" && targetModule.类型 !== "readOnlyDisplay") {
          issues.push({
            level: "error",
            code: "UNSUPPORTED_DEPENDENCY_TARGET_MODULE",
            text: `fillText 目标模块必须是 Free Text、Long Text 或 ReadOnly Display：${action.目标模块ID}`,
            path: `dependencies.${dependency.ID}.动作.${actionIndex}.目标模块ID`,
          });
        }

        if (action.写入方式 === "追加" && targetModule.类型 === "readOnlyDisplay") {
          issues.push({
            level: "error",
            code: "UNSUPPORTED_APPEND_TARGET_MODULE",
            text: `fillText 追加目标必须是 Free Text 或 Long Text：${action.目标模块ID}`,
            path: `dependencies.${dependency.ID}.动作.${actionIndex}.目标模块ID`,
          });
        }

        if (typeof action.内容 !== "string" && dependency.触发.类型 !== "resourceSelected") {
          issues.push({
            level: "error",
            code: "UNSUPPORTED_DEPENDENCY_ACTION_CONTENT",
            text: `selectedResourceField 内容只能用于 resourceSelected 触发：${dependency.ID}`,
            path: `dependencies.${dependency.ID}.动作.${actionIndex}.内容.类型`,
          });
        }
        if (typeof action.内容 !== "string") {
          const content = action.内容;
          const fields = content.类型 === "selectedResourceField"
            ? [content.字段]
            : getResourceTextTemplateFields(content.格式);
          fields.forEach((field) => validateSelectedResourceField(
            systemPackage,
            sourceModule,
            field,
            `dependencies.${dependency.ID}.动作.${actionIndex}.内容.${content.类型 === "selectedResourceField" ? "字段" : "格式"}`,
            dependency.ID,
            issues,
          ));
        }
      }

      if (action.类型 === "fillCountable") {
        const targetModule = moduleById.get(action.目标模块ID);
        if (!targetModule) {
          issues.push({
            level: "error",
            code: "MISSING_DEPENDENCY_TARGET_MODULE",
            text: `Dependency Rule 引用了不存在的目标模块：${action.目标模块ID}`,
            path: `dependencies.${dependency.ID}.动作.${actionIndex}.目标模块ID`,
          });
          return;
        }
        if (targetModule.类型 !== "countableResource") {
          issues.push({
            level: "error",
            code: "UNSUPPORTED_DEPENDENCY_TARGET_MODULE",
            text: `fillCountable 目标模块必须是 Countable Resource：${action.目标模块ID}`,
            path: `dependencies.${dependency.ID}.动作.${actionIndex}.目标模块ID`,
          });
        }

        for (const [fieldName, content] of [["当前值", action.当前值], ["最大值", action.最大值]] as const) {
          if (!content || typeof content === "number") {
            continue;
          }
          if (dependency.触发.类型 !== "resourceSelected") {
            issues.push({
              level: "error",
              code: "UNSUPPORTED_DEPENDENCY_ACTION_CONTENT",
              text: `fillCountable selectedResourceField 只能用于 resourceSelected 触发：${dependency.ID}`,
              path: `dependencies.${dependency.ID}.动作.${actionIndex}.${fieldName}.类型`,
            });
          }
          validateSelectedResourceField(systemPackage, sourceModule, content.字段, `dependencies.${dependency.ID}.动作.${actionIndex}.${fieldName}.字段`, dependency.ID, issues);
          if (sourceModule?.类型 === "resourcePicker" && sourceModule.多选 && content.选择索引 === undefined) {
            issues.push({
              level: "error",
              code: "COUNTABLE_SELECTION_INDEX_REQUIRED",
              text: `多选 Resource Picker 的 fillCountable selectedResourceField 必须声明选择索引：${dependency.ID}`,
              path: `dependencies.${dependency.ID}.动作.${actionIndex}.${fieldName}.选择索引`,
            });
          }
        }
      }

      if (action.类型 === "setVisibility") {
        if (action.目标类型 === "module" && !moduleById.has(action.目标ID)) {
          issues.push({
            level: "error",
            code: "MISSING_DEPENDENCY_TARGET_MODULE",
            text: `setVisibility 引用了不存在的目标模块：${action.目标ID}`,
            path: `dependencies.${dependency.ID}.动作.${actionIndex}.目标ID`,
          });
        }

        if (action.目标类型 === "page" && !pageById.has(action.目标ID)) {
          issues.push({
            level: "error",
            code: "MISSING_DEPENDENCY_TARGET_PAGE",
            text: `setVisibility 引用了不存在的目标页面：${action.目标ID}`,
            path: `dependencies.${dependency.ID}.动作.${actionIndex}.目标ID`,
          });
        }
      }

      if (action.类型 === "setResourceDefaultFilter") {
        const targetModule = moduleById.get(action.目标模块ID);
        if (!targetModule) {
          issues.push({
            level: "error",
            code: "MISSING_DEPENDENCY_TARGET_MODULE",
            text: `setResourceDefaultFilter 引用了不存在的目标模块：${action.目标模块ID}`,
            path: `dependencies.${dependency.ID}.动作.${actionIndex}.目标模块ID`,
          });
          return;
        }

        if (targetModule.类型 !== "resourcePicker") {
          issues.push({
            level: "error",
            code: "UNSUPPORTED_DEPENDENCY_TARGET_MODULE",
            text: `setResourceDefaultFilter 目标模块必须是 Resource Picker：${action.目标模块ID}`,
            path: `dependencies.${dependency.ID}.动作.${actionIndex}.目标模块ID`,
          });
        } else {
          for (const link of getResourcePickerLinks(targetModule)) {
            validateResourceLibraryField(findResourceLibrary(systemPackage, link.ID), action.字段, `dependencies.${dependency.ID}.动作.${actionIndex}.字段`, dependency.ID, targetModule.ID, issues);
          }
        }
        if (!Array.isArray(action.值)) {
          if (dependency.触发.类型 !== "resourceSelected") {
            issues.push({
              level: "error",
              code: "UNSUPPORTED_DEPENDENCY_ACTION_CONTENT",
              text: `setResourceDefaultFilter selectedResourceField 只能用于 resourceSelected 触发：${dependency.ID}`,
              path: `dependencies.${dependency.ID}.动作.${actionIndex}.值.类型`,
            });
          }
          validateSelectedResourceField(systemPackage, sourceModule, action.值.字段, `dependencies.${dependency.ID}.动作.${actionIndex}.值.字段`, dependency.ID, issues);
        }
      }
    });
  }

  const writtenTargets = new Map<string, string[]>();
  for (const dependency of systemPackage.dependencies ?? []) {
    for (const [actionIndex, action] of (dependency.动作 ?? []).entries()) {
      if (!("目标模块ID" in action)) continue;
      const writers = writtenTargets.get(action.目标模块ID);
      if (writers && !writers.includes(dependency.ID)) {
        issues.push({
          level: "warning",
          code: "DUPLICATE_DEPENDENCY_WRITE_TARGET",
          text: `Dependency Rule "${dependency.ID}" 与 "${writers[0]}" 都写入同一目标模块：${action.目标模块ID}`,
          path: `dependencies.${dependency.ID}.动作.${actionIndex}`,
        });
      }
      writtenTargets.set(action.目标模块ID, [...(writers ?? []), dependency.ID]);
    }
  }

  for (const module of systemPackage.modules) {
    if (module.类型 !== "resourcePicker" || !module.创建卡牌) {
      continue;
    }

    const targetModule = moduleById.get(module.创建卡牌.卡牌桌面模块ID);
    if (!targetModule) {
      issues.push({
        level: "error",
        code: "MISSING_CARD_TABLE_REFERENCE",
        text: `Resource Picker 创建卡牌引用了不存在的 Card Table：${module.创建卡牌.卡牌桌面模块ID}`,
        path: `modules.${module.ID}.创建卡牌.卡牌桌面模块ID`,
      });
      continue;
    }

    if (targetModule.类型 !== "cardTable") {
      issues.push({
        level: "error",
        code: "UNSUPPORTED_CARD_TABLE_REFERENCE",
        text: `Resource Picker 创建卡牌目标必须是 Card Table：${module.创建卡牌.卡牌桌面模块ID}`,
        path: `modules.${module.ID}.创建卡牌.卡牌桌面模块ID`,
      });
      continue;
    }

    const hasSourceMismatch = module.资源库 === "其他"
      ? !targetModule.资源来源.some((source) => source.类型 === "otherResourceLibraries")
      : getResourcePickerLinks(module).some((link) => !targetModule.资源来源.some((source) => source.类型 === "resourceLibrary" && source.ID === link.ID));
    if (hasSourceMismatch) {
      issues.push({
        level: "error",
        code: "CARD_TABLE_LIBRARY_MISMATCH",
        text: `Resource Picker 的 Resource Library 不在 Card Table 的资源来源中：${module.ID}`,
        path: `modules.${module.ID}.创建卡牌.卡牌桌面模块ID`,
      });
    }
    if (module.创建卡牌.默认状态 && targetModule.状态选项 && !targetModule.状态选项.includes(module.创建卡牌.默认状态)) {
      issues.push({
        level: "error",
        code: "CARD_DEFAULT_STATE_UNKNOWN",
        text: `Resource Picker 默认状态不在目标 Card Table 的状态选项中：${module.创建卡牌.默认状态}`,
        path: `modules.${module.ID}.创建卡牌.默认状态`,
      });
    }
  }

  for (const module of systemPackage.modules) {
    if (module.类型 !== "resourceComposer" || !module.创建卡牌) continue;
    const targetModule = moduleById.get(module.创建卡牌.卡牌桌面模块ID);
    if (!targetModule) {
      issues.push({ level: "error", code: "MISSING_CARD_TABLE_REFERENCE", text: `Resource Composer 创建卡牌引用了不存在的 Card Table：${module.创建卡牌.卡牌桌面模块ID}`, path: `modules.${module.ID}.创建卡牌.卡牌桌面模块ID` });
      continue;
    }
    if (targetModule.类型 !== "cardTable") {
      issues.push({ level: "error", code: "UNSUPPORTED_CARD_TABLE_REFERENCE", text: `Resource Composer 创建卡牌目标必须是 Card Table：${module.创建卡牌.卡牌桌面模块ID}`, path: `modules.${module.ID}.创建卡牌.卡牌桌面模块ID` });
      continue;
    }
    if (!targetModule.资源来源.some((source) => source.类型 === "resourceComposer" && source.ID === module.ID)) {
      issues.push({ level: "error", code: "CARD_TABLE_COMPOSER_MISMATCH", text: `Resource Composer 不在 Card Table 的资源来源中：${module.ID}`, path: `modules.${module.ID}.创建卡牌.卡牌桌面模块ID` });
    }
    if (module.创建卡牌.默认状态 && targetModule.状态选项 && !targetModule.状态选项.includes(module.创建卡牌.默认状态)) {
      issues.push({ level: "error", code: "CARD_DEFAULT_STATE_UNKNOWN", text: `Resource Composer 默认状态不在目标 Card Table 的状态选项中：${module.创建卡牌.默认状态}`, path: `modules.${module.ID}.创建卡牌.默认状态` });
    }
  }

  const cardArtFieldsByLibrary = new Map<string, Set<string>>();
  const cardPresentationsByLibrary = new Map<string, Array<{ moduleId: string; presentation?: z.infer<typeof cardPresentationSchema> }>>();
  for (const module of systemPackage.modules) {
    if (module.类型 !== "cardTable") {
      continue;
    }
    for (const source of module.资源来源.filter((candidate) => candidate.类型 === "resourceLibrary")) {
      const libraryId = source.ID;
      const artField = module.卡图字段 ?? "卡图";
      const artFields = cardArtFieldsByLibrary.get(libraryId) ?? new Set<string>();
      artFields.add(artField);
      artFields.add(module.卡背字段 ?? "卡背");
      cardArtFieldsByLibrary.set(libraryId, artFields);

      const presentations = cardPresentationsByLibrary.get(libraryId) ?? [];
      presentations.push({ moduleId: module.ID, presentation: source.卡牌展示 });
      cardPresentationsByLibrary.set(libraryId, presentations);
    }
    for (const source of module.资源来源.filter((candidate) => candidate.类型 === "resourceComposer")) {
      const composer = systemPackage.modules.find((candidate) => candidate.类型 === "resourceComposer" && candidate.ID === source.ID);
      if (composer?.类型 !== "resourceComposer") continue;
      for (const outputField of [module.卡图字段 ?? "卡图", module.卡背字段 ?? "卡背"]) {
        const mapping = composer.输出字段.find((candidate) => candidate.字段 === outputField);
        const slot = mapping ? composer.来源槽位.find((candidate) => candidate.ID === mapping.来源槽位ID) : undefined;
        if (!mapping || !slot) continue;
        const artFields = cardArtFieldsByLibrary.get(slot.资源库ID) ?? new Set<string>();
        artFields.add(mapping.来源字段);
        cardArtFieldsByLibrary.set(slot.资源库ID, artFields);
      }
    }
  }

  for (const library of systemPackage.resourceLibraries ?? []) {
    for (const { moduleId, presentation } of cardPresentationsByLibrary.get(library.ID) ?? []) {
      for (const field of library.entries.length > 0 ? getCardPresentationFields(presentation) : []) {
        if (library.fields.some((candidate) => candidate.key === field)) continue;
        issues.push({
          level: "error",
          code: "MISSING_RESOURCE_FIELD_REFERENCE",
          text: `Card Presentation 引用了不存在的 Resource 字段：${field}`,
          path: `modules.${moduleId}.资源来源`,
          evidence: [{ label: "requiredField", value: field }, { label: "resourceLibraryId", value: library.ID }],
        });
      }
    }

    for (const module of systemPackage.modules) {
      if (module.类型 !== "cardTable" || !findCardTableResourceLibrarySource(systemPackage, module, library.ID)) {
        continue;
      }
      const reverseIdField = module.背面卡牌ID字段 ?? "背面卡牌ID";
      const definitionsById = new Map(library.entries.map((entry) => [entry.ID, entry]));
      library.entries.forEach((entry, entryIndex) => {
        const reverseId = (entry.fields[reverseIdField] ?? "").trim();
        if (!reverseId) {
          return;
        }
        if (reverseId === entry.ID) {
          issues.push({
            level: "error",
            code: "CARD_REVERSE_DEFINITION_SELF_REFERENCE",
            text: `Card Definition 的背面不能引用自身：${entry.ID}`,
            path: `resourceLibraries.${library.ID}.entries.${entryIndex}.${reverseIdField}`,
          });
        } else if (!definitionsById.has(reverseId)) {
          issues.push({
            level: "error",
            code: "MISSING_CARD_REVERSE_DEFINITION_REFERENCE",
            text: `Card Definition 引用了不存在的背面 Card Definition：${reverseId}`,
            path: `resourceLibraries.${library.ID}.entries.${entryIndex}.${reverseIdField}`,
          });
        }
      });
    }

    const artFields = cardArtFieldsByLibrary.get(library.ID);
    if (!artFields || artFields.size === 0) {
      continue;
    }

    library.entries.forEach((entry, entryIndex) => {
      for (const artField of artFields) {
        const cardArtRef = entry.fields[artField];
        if (cardArtRef) {
          usedAssetRefs.add(cardArtRef);
        }
        if (!cardArtRef || assetRefs.has(cardArtRef)) {
          continue;
        }

        issues.push({
          level: "error",
          code: "MISSING_CARD_ART_ASSET_REFERENCE",
          text: `Card Definition 引用了不存在的卡图 Asset：${cardArtRef}`,
          path: `resourceLibraries.${library.ID}.entries.${entryIndex}.${artField}`,
        });
      }
    });
  }

  for (const page of systemPackage.pages) {
    const htmlIssues = validateHtmlTemplate(page.layout.htmlContent, `pages.${page.ID}.layout.html`);
    issues.push(...htmlIssues);
    issues.push(...validateTemplateCss(page.layout.cssContent, `pages.${page.ID}.layout.css`));
    collectTemplateImageReferences(page.layout.htmlContent, page.layout.cssContent).forEach((assetPath) => {
      usedAssetRefs.add(assetPath);
      if (!assetRefs.has(assetPath)) {
        issues.push({
          level: "error",
          code: "MISSING_TEMPLATE_IMAGE_REFERENCE",
          text: `HTML Layout Template 引用了不存在的图片：${assetPath}`,
          path: `pages.${page.ID}.layout.html`,
        });
      }
    });

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

  if (systemPackage.shell) {
    issues.push(...validateHtmlTemplate(systemPackage.shell.htmlContent, "shell.html"));
    issues.push(...validateTemplateCss(systemPackage.shell.cssContent, "shell.css"));
    collectTemplateImageReferences(systemPackage.shell.htmlContent, systemPackage.shell.cssContent).forEach((assetPath) => {
      usedAssetRefs.add(assetPath);
      if (!assetRefs.has(assetPath)) {
        issues.push({ level: "error", code: "MISSING_TEMPLATE_IMAGE_REFERENCE", text: `Sheet Shell 引用了不存在的图片：${assetPath}`, path: "shell.html" });
      }
    });
    for (const moduleId of getHtmlTemplateModuleReferences(systemPackage.shell.htmlContent)) {
      if (!moduleIds.has(moduleId)) issues.push({ level: "error", code: "MISSING_MODULE_REFERENCE", text: `Sheet Shell 引用了不存在的 Sheet Module：${moduleId}`, path: "shell.html" });
    }
    const outletCount = (systemPackage.shell.htmlContent.match(/<pb-page-outlet\b/gi) ?? []).length;
    if (outletCount !== 1) issues.push({ level: "error", code: "SHELL_PAGE_OUTLET_COUNT_INVALID", text: "Sheet Shell 必须且只能包含一个 pb-page-outlet。", path: "shell.html" });
  }

  for (const assetPath of assetRefs) {
    if (!usedAssetRefs.has(assetPath)) {
      issues.push({
        level: "warning",
        code: "UNUSED_PACKAGE_IMAGE",
        text: `System Package 图片未被引用：${assetPath}`,
        path: assetPath,
      });
    }
  }

  for (const [checkIndex, check] of (systemPackage.validationChecks ?? []).entries()) {
    try {
      parseJavaScript(check.scriptContent, { ecmaVersion: "latest", sourceType: "script", locations: true });
    } catch (error) {
      const location = getJavaScriptErrorLocation(error);
      issues.push({
        level: "error",
        code: "VALIDATION_SCRIPT_SYNTAX_INVALID",
        text: `Validation Script JavaScript 语法错误：${check.ID}${location ? `（${location.line}:${location.column}）` : ""}`,
        path: `validationChecks.${checkIndex}.scriptContent`,
        location: { pointer: ["validationChecks", checkIndex, "scriptContent"], line: location?.line, column: location?.column },
        evidence: [{ label: "parserMessage", value: getErrorMessage(error) }],
      });
    }
  }

  if (issues.some((issue) => issue.level === "error" || issue.level === "fatal")) {
    return { ok: false, issues };
  }

  return { ok: true, package: systemPackage, issues };
}

function collectDuplicateIdIssues<T extends { ID: string }>(
  values: T[],
  entityName: string,
  code: string,
  pathPrefix: string,
  issues: PackageIssue[],
) {
  const firstIndexById = new Map<string, number>();
  values.forEach((value, index) => {
    const firstIndex = firstIndexById.get(value.ID);
    if (firstIndex !== undefined) {
      issues.push({
        level: "error",
        code,
        text: `${entityName} ID 重复：${value.ID}（首次声明于索引 ${firstIndex}）`,
        path: `${pathPrefix}.${index}.ID`,
        evidence: [{ label: "duplicateId", value: value.ID }, { label: "firstIndex", value: firstIndex }, { label: "duplicateIndex", value: index }],
      });
      return;
    }
    firstIndexById.set(value.ID, index);
  });
}

function validateSelectedResourceField(systemPackage: SystemPackage, sourceModule: SheetModule | undefined, field: string, path: string, dependencyId: string, issues: PackageIssue[]) {
  if (sourceModule?.类型 === "resourcePicker") {
    for (const link of getResourcePickerLinks(sourceModule)) {
      validateResourceLibraryField(findResourceLibrary(systemPackage, link.ID), field, path, dependencyId, sourceModule.ID, issues);
    }
    return;
  }

  if (sourceModule?.类型 === "resourceComposer" && field !== "ID"
    && !sourceModule.输出字段.some((mapping) => mapping.字段 === field)
    && sourceModule.选择关系输出?.字段 !== field) {
    issues.push({
      level: "error",
      code: "MISSING_RESOURCE_FIELD_REFERENCE",
      text: `Dependency Rule ${dependencyId} 引用了 Resource Composer ${sourceModule.ID} 中不存在的输出字段 ${field}`,
      path,
      evidence: [{
        label: "referencedField",
        value: field,
      }, {
        label: "knownFields",
        value: [...sourceModule.输出字段.map((mapping) => mapping.字段), ...(sourceModule.选择关系输出 ? [sourceModule.选择关系输出.字段] : [])],
      }],
    });
  }
}

function collectTemplateImageReferences(html: string, css: string | undefined): string[] {
  const references = new Set<string>();
  for (const match of html.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/giu)) {
    if (isPackageImageReference(match[1])) references.add(match[1]);
  }
  for (const match of (css ?? "").matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/giu)) {
    if (isPackageImageReference(match[1])) references.add(match[1]);
  }
  return [...references];
}

function isPackageImageReference(value: string): boolean {
  return !isExternalResourceReference(value) && /\.(?:png|jpe?g|webp|gif|avif|svg)$/iu.test(value);
}

function validateResourceLibraryField(library: ResourceLibrary | undefined, field: string, path: string, dependencyId: string, moduleId: string, issues: PackageIssue[]) {
  if (!library || library.fields.some((candidate) => candidate.key === field)) return;
  const knownFields = library.fields.map((candidate) => candidate.key);
  issues.push({
    level: "error",
    code: "MISSING_RESOURCE_FIELD_REFERENCE",
    text: `Dependency Rule ${dependencyId} 的模块 ${moduleId} 引用了 Resource Library ${library.ID} 中不存在的字段 ${field}；已知字段：${knownFields.join("、")}`,
    path,
    evidence: [{ label: "referencedField", value: field }, { label: "knownFields", value: knownFields }],
  });
}

function getJavaScriptErrorLocation(error: unknown): { line: number; column: number } | undefined {
  if (!isPlainObject(error) || !isPlainObject(error.loc)) return undefined;
  return typeof error.loc.line === "number" && typeof error.loc.column === "number" ? { line: error.loc.line, column: error.loc.column } : undefined;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizePackageIssue(issue: PackageIssue, sourceMap: PackageSourceMap): PackageIssue {
  const pointer = issue.location?.pointer ?? parseDiagnosticPointer(issue.path);
  const file = issue.location?.file ?? resolveSourceFile(pointer, sourceMap);
  const entities = issue.entities ?? inferDiagnosticEntities(pointer);
  return {
    ...issue,
    location: pointer.length > 0 || file || issue.location?.line !== undefined
      ? { ...issue.location, pointer, ...(file ? { file } : {}) }
      : undefined,
    ...(entities.length > 0 ? { entities } : {}),
  };
}

function parseDiagnosticPointer(path?: string): Array<string | number> {
  if (!path) return [];
  return path.split(".").filter(Boolean).map((part) => /^\d+$/.test(part) ? Number(part) : part);
}

function resolveSourceFile(pointer: Array<string | number>, sourceMap: PackageSourceMap): string | undefined {
  for (let length = pointer.length; length > 0; length -= 1) {
    const key = pointer.slice(0, length).join(".");
    if (sourceMap[key]) return sourceMap[key];
  }
  return undefined;
}

function inferDiagnosticEntities(pointer: Array<string | number>): PackageIssueEntity[] {
  const [root, identity] = pointer;
  const definitions: Record<string, PackageIssueEntity["kind"]> = {
    manifest: "manifest", pages: "page", modules: "module", assets: "asset",
    resourceLibraries: "resourceLibrary", dependencies: "dependency",
    validationChecks: "validationCheck", characterCreationGuide: "guideStep",
  };
  const kind = typeof root === "string" ? definitions[root] : undefined;
  if (!kind) return [];
  return [{ kind, ...(typeof identity === "number" ? { index: identity } : typeof identity === "string" ? { id: identity } : {}) }];
}

const cachedValidModuleTypes = new Set(["freeText", "longText", "countableResource", "checkboxResource", "readOnlyDisplay", "imageField", "cardTable", "resourcePicker", "resourceComposer", "selectionGroup"]);

export function validateCachedSystemPackage(input: unknown): CachedPackageValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, issues: [{ level: "fatal", code: "CACHED_PACKAGE_INVALID", text: "缓存的 System Package 数据格式不正确。" }] };
  }
  const obj = input as Record<string, unknown>;
  if (!obj.manifest || typeof obj.manifest !== "object" || !(obj.manifest as Record<string, unknown>).ID) {
    return { ok: false, issues: [{ level: "fatal", code: "CACHED_PACKAGE_INCOMPLETE", text: "缓存的 System Package 缺少 manifest.ID。" }] };
  }
  if (!Array.isArray(obj.modules) || obj.modules.length === 0) {
    return { ok: false, issues: [{ level: "fatal", code: "CACHED_PACKAGE_INCOMPLETE", text: "缓存的 System Package 缺少 modules。" }] };
  }
  for (const [index, module] of obj.modules.entries()) {
    if (typeof module !== "object" || module === null || !(module as Record<string, unknown>).类型) {
      return { ok: false, issues: [{ level: "fatal", code: "CACHED_PACKAGE_INVALID_MODULE", text: `缓存的 System Package 第 ${index} 个模块缺少 类型 字段。` }] };
    }
    if (!cachedValidModuleTypes.has((module as Record<string, unknown>).类型 as string)) {
      return { ok: false, issues: [{ level: "fatal", code: "CACHED_PACKAGE_INVALID_MODULE_TYPE", text: `缓存的 System Package 第 ${index} 个模块类型 ${(module as Record<string, unknown>).类型} 无效。` }] };
    }
  }
  return { ok: true, package: input as SystemPackage };
}

export function findModule(systemPackage: SystemPackage, moduleId: string): SheetModule | undefined {
  return systemPackage.modules.find((module) => module.ID === moduleId);
}

export function findAsset(systemPackage: SystemPackage, assetPath: string): PackageAsset | undefined {
  return systemPackage.assets?.find((asset) => asset.路径 === assetPath);
}

export function findResourceLibrary(systemPackage: SystemPackage, libraryId: string): ResourceLibrary | undefined {
  return systemPackage.resourceLibraries?.find((library) => library.ID === libraryId);
}

export function getResourcePickerLinks(module: ResourcePickerModule) {
  return module.资源库 === "其他" ? [] : module.资源库;
}

export function getOtherResourceLibraries(systemPackage: SystemPackage): ResourceLibrary[] {
  const linked = new Set<string>();
  for (const module of systemPackage.modules) {
    if (module.类型 === "resourcePicker") {
      for (const link of getResourcePickerLinks(module)) linked.add(link.ID);
    } else if (module.类型 === "resourceComposer") {
      for (const slot of module.来源槽位) linked.add(slot.资源库ID);
    }
  }
  return (systemPackage.resourceLibraries ?? []).filter((library) =>
    library.路径.startsWith("resource-extension:") && !linked.has(library.ID));
}

export function findCardTableResourceLibrarySource(
  systemPackage: SystemPackage,
  module: CardTableModule,
  libraryId: string,
): CardTableResourceSource | undefined {
  const explicit = module.资源来源.find((source) => source.类型 === "resourceLibrary" && source.ID === libraryId);
  if (explicit) return explicit;
  if (!getOtherResourceLibraries(systemPackage).some((library) => library.ID === libraryId)) return undefined;
  return module.资源来源.find((source) => source.类型 === "otherResourceLibraries");
}

function isResourceCondition(
  condition: DependencyCondition | undefined,
): condition is Extract<DependencyCondition, { 类型: "selectedResourceFieldEquals" | "selectedResourceFieldIn" | "selectedResourceFieldNotEquals" }> {
  return (
    condition?.类型 === "selectedResourceFieldEquals" ||
    condition?.类型 === "selectedResourceFieldIn" ||
    condition?.类型 === "selectedResourceFieldNotEquals"
  );
}

function isCheckboxCondition(
  condition: DependencyCondition | undefined,
): condition is Extract<DependencyCondition, { 类型: "checkboxOptionChecked" | "checkboxOptionUnchecked" }> {
  return condition?.类型 === "checkboxOptionChecked" || condition?.类型 === "checkboxOptionUnchecked";
}

export function getHtmlTemplateModuleReferences(html: string): string[] {
  const matches = html.matchAll(/<pb-module\b[^>]*\bid\s*=\s*["']([^"']+)["'][^>]*>/gi);
  return [...matches].map((match) => match[1]);
}

function validateSkinLayoutOverrides(
  systemPackage: SystemPackage,
  skin: SystemPackageSkin,
  assetRefs: Set<string>,
  usedAssetRefs: Set<string>,
  issues: PackageIssue[],
): void {
  const overrides = skin.layoutOverrides;
  if (!overrides) return;

  const moduleIds = new Set(systemPackage.modules.map((module) => module.ID));
  const pageById = new Map(systemPackage.pages.map((page) => [page.ID, page]));
  const seenPageIds = new Set<string>();

  for (const override of overrides.pages ?? []) {
    const path = `skins.${skin.ID}.layoutOverrides.pages.${override.ID}.html`;
    if (seenPageIds.has(override.ID)) {
      issues.push({ level: "error", code: "DUPLICATE_SKIN_LAYOUT_OVERRIDE_PAGE_ID", text: `Skin Page override ID 重复：${override.ID}`, path });
      continue;
    }
    seenPageIds.add(override.ID);
    const basePage = pageById.get(override.ID);
    if (!basePage) {
      issues.push({ level: "error", code: "SKIN_LAYOUT_OVERRIDE_PAGE_UNKNOWN", text: `Skin 引用了不存在的 Page：${override.ID}`, path: `skins.${skin.ID}.layoutOverrides.pages.${override.ID}.ID` });
      continue;
    }
    issues.push(...validateHtmlTemplate(override.htmlContent, path));
    validateOverrideModuleOwnership(basePage.layout.htmlContent, override.htmlContent, path, issues);
    validateOverrideModuleReferences(override.htmlContent, moduleIds, path, issues);
    if (printPageMarkerCount(override.htmlContent) !== printPageMarkerCount(basePage.layout.htmlContent)) {
      issues.push({ level: "error", code: "SKIN_LAYOUT_PRINT_PAGE_MISMATCH", text: "Skin Page override 不能改变 data-print-page 页面数量。", path });
    }
    collectTemplateImageReferences(override.htmlContent, undefined).forEach((assetPath) => {
      usedAssetRefs.add(assetPath);
      if (!assetRefs.has(assetPath)) issues.push({ level: "error", code: "MISSING_TEMPLATE_IMAGE_REFERENCE", text: `Skin HTML override 引用了不存在的图片：${assetPath}`, path });
    });
  }

  if (overrides.shell) {
    const path = `skins.${skin.ID}.layoutOverrides.shell.html`;
    if (!systemPackage.shell) {
      issues.push({ level: "error", code: "SKIN_LAYOUT_OVERRIDE_SHELL_MISSING_BASE", text: "没有 Base Sheet Shell 时不能声明 Skin Shell override。", path });
    } else {
      issues.push(...validateHtmlTemplate(overrides.shell.htmlContent, path));
      validateOverrideModuleOwnership(systemPackage.shell.htmlContent, overrides.shell.htmlContent, path, issues);
      validateOverrideModuleReferences(overrides.shell.htmlContent, moduleIds, path, issues);
      const outletCount = (overrides.shell.htmlContent.match(/<pb-page-outlet\b/gi) ?? []).length;
      if (outletCount !== 1) issues.push({ level: "error", code: "SHELL_PAGE_OUTLET_COUNT_INVALID", text: "Skin Sheet Shell override 必须且只能包含一个 pb-page-outlet。", path });
      if (printPageMarkerCount(overrides.shell.htmlContent) !== printPageMarkerCount(systemPackage.shell.htmlContent)) {
        issues.push({ level: "error", code: "SKIN_LAYOUT_PRINT_PAGE_MISMATCH", text: "Skin Sheet Shell override 不能改变 data-print-page 页面数量。", path });
      }
      collectTemplateImageReferences(overrides.shell.htmlContent, undefined).forEach((assetPath) => {
        usedAssetRefs.add(assetPath);
        if (!assetRefs.has(assetPath)) issues.push({ level: "error", code: "MISSING_TEMPLATE_IMAGE_REFERENCE", text: `Skin Shell override 引用了不存在的图片：${assetPath}`, path });
      });
    }
  }

  const effectiveRegions = new Set<string>();
  let duplicateRegion = false;
  const pageOverrides = new Map((overrides.pages ?? []).map((override) => [override.ID, override.htmlContent]));
  const effectiveHtml = systemPackage.pages.map((page) => pageOverrides.get(page.ID) ?? page.layout.htmlContent);
  if (systemPackage.shell) effectiveHtml.push(overrides.shell?.htmlContent ?? systemPackage.shell.htmlContent);
  for (const html of effectiveHtml) {
    for (const regionId of getHtmlTemplateGuideRegionIds(html)) {
      if (effectiveRegions.has(regionId)) duplicateRegion = true;
      effectiveRegions.add(regionId);
    }
  }
  if (duplicateRegion) issues.push({ level: "error", code: "DUPLICATE_GUIDE_REGION_ID", text: `Skin ${skin.ID} 的有效 Layout Region ID 必须全包唯一。`, path: `skins.${skin.ID}.layoutOverrides` });
  for (const [stepIndex, step] of (systemPackage.characterCreationGuide?.步骤 ?? []).entries()) {
    if (step.目标?.类型 === "region" && !effectiveRegions.has(step.目标.区域ID)) {
      issues.push({ level: "error", code: "MISSING_GUIDE_TARGET_REGION", text: `Skin ${skin.ID} 缺少 Guide Layout Region：${step.目标.区域ID}`, path: `characterCreationGuide.步骤.${stepIndex}.目标.区域ID` });
    }
  }
}

function validateOverrideModuleOwnership(baseHtml: string, overrideHtml: string, path: string, issues: PackageIssue[]): void {
  const baseIds = getHtmlTemplateModuleReferences(baseHtml).sort();
  const overrideIds = getHtmlTemplateModuleReferences(overrideHtml).sort();
  if (baseIds.length !== overrideIds.length || baseIds.some((id, index) => id !== overrideIds[index])) {
    issues.push({ level: "error", code: "SKIN_LAYOUT_MODULE_OWNERSHIP_MISMATCH", text: "Skin HTML override 必须保留 Base Layout 的完整 Sheet Module 集合。", path });
  }
}

function validateOverrideModuleReferences(html: string, moduleIds: Set<string>, path: string, issues: PackageIssue[]): void {
  for (const moduleId of getHtmlTemplateModuleReferences(html)) {
    if (!moduleIds.has(moduleId)) issues.push({ level: "error", code: "MISSING_MODULE_REFERENCE", text: `Skin HTML override 引用了不存在的 Sheet Module：${moduleId}`, path });
  }
}

function printPageMarkerCount(html: string): number {
  return (html.match(/\bdata-print-page\s*=\s*["']true["']/gi) ?? []).length;
}

export function getHtmlTemplateGuideRegionIds(html: string): string[] {
  const matches = html.matchAll(/<[a-z][a-z0-9-]*\b[^>]*\bdata-guide-region-id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi);
  return [...matches].map((match) => match[1] ?? match[2] ?? match[3]);
}

const forbiddenHtmlTags = new Set(["button", "form", "input", "script", "select", "textarea"]);
const allowedGlobalHtmlAttributes = new Set(["aria-label", "class", "title"]);
const allowedHtmlAttributesByTag = new Map([
  ["img", new Set(["alt", "src"])],
  ["pb-module", new Set(["id"])],
  ["pb-page-outlet", new Set()],
  ["td", new Set(["colspan", "rowspan"])],
  ["th", new Set(["colspan", "rowspan"])],
]);
export const allowedHtmlTags = new Set([
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
  "pb-page-outlet",
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

    if (attributeName === "data-guide-region-id" && !attributeValue?.trim()) {
      issues.push({
        level: "error",
        code: "GUIDE_REGION_ID_EMPTY",
        text: "HTML Layout Template 的 data-guide-region-id 不能为空。",
        path,
      });
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

  if (/@font-face\b/i.test(css)) {
    issues.push({
      level: "error",
      code: "CSS_TEMPLATE_FONT_FACE_FORBIDDEN",
      text: "HTML Layout Template 与 Skin CSS 禁止 @font-face。",
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
