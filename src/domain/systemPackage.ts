import { z } from "zod";
import { parse as parseJavaScript } from "acorn";
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
  资源ID: z.string().min(1).optional(),
  替代文本: z.string().optional(),
});

const imageFieldModuleSchema = sheetModuleBaseSchema.extend({
  类型: z.literal("imageField"),
  标签: z.string().min(1),
  替代文本: z.string().optional(),
});

const cardTableModuleSchema = sheetModuleBaseSchema.extend({
  类型: z.literal("cardTable"),
  标签: z.string().min(1),
  资源库IDs: z.array(z.string().min(1)).min(1).refine((ids) => new Set(ids).size === ids.length, {
    message: "Card Table 的资源库IDs不能重复。",
  }),
  状态选项: z.array(z.string().min(1)).min(1).refine((states) => new Set(states).size === states.length, {
    message: "Card Table 的状态选项不能重复。",
  }).optional(),
  状态背景色: z.record(
    z.string().min(1),
    z.string().regex(/^#[0-9a-fA-F]{6}$/, "Card state 背景色必须是 #RRGGBB 六位十六进制颜色。"),
  ).optional(),
  显示方式: z.enum(["image", "text"]).optional(),
  卡名字段: z.string().min(1).optional(),
  描述字段: z.string().min(1).optional(),
  卡图字段: z.string().min(1).optional(),
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
  资源库ID: z.string().min(1),
  字段模板: z.array(resourceLibraryFieldTemplateSchema).optional(),
  多选: z.boolean().optional(),
  默认查询: resourcePickerQuerySchema.optional(),
  创建卡牌: z
    .object({
      卡牌桌面模块ID: z.string().min(1),
      默认状态: z.string().min(1).optional(),
    })
    .optional(),
});

const dependencySourceSchema = z.discriminatedUnion("类型", [
  z.object({
    类型: z.literal("resourcePicker"),
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
    值: z.array(z.string()).min(1),
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
]);

const supportedModuleTypes: Set<string> = new Set(
  sheetModuleSchema.options.map((option) => option.shape["类型"].value),
);

const htmlTemplateLayoutSchema = z.object({
  类型: z.literal("htmlTemplate"),
  htmlContent: z.string().min(1),
  cssContent: z.string().optional(),
});

const pageSchema = z.object({
  ID: z.string().min(1),
  名称: z.string().min(1),
  默认隐藏: z.boolean().optional(),
  打印: z.boolean().optional(),
  layout: htmlTemplateLayoutSchema,
});

const assetSchema = z.object({
  ID: z.string().min(1),
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
export type ResourcePickerModule = z.infer<typeof resourcePickerModuleSchema>;
export type SheetModule = z.infer<typeof sheetModuleSchema>;
export type PackageAsset = z.infer<typeof assetSchema>;
export type HtmlTemplateLayout = z.infer<typeof htmlTemplateLayoutSchema>;
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
    resourceLibraries: _rawResourceLibraries,
    dependencies: _rawDependencies,
    characterCreationGuide: _rawGuide,
    ...packageData
  } = parsed.data;
  const systemPackage: SystemPackage = {
    ...packageData,
    modules,
    ...(parsedDependencies.dependencies.length > 0 ? { dependencies: parsedDependencies.dependencies } : {}),
    ...(normalizedResourceLibraries.resourceLibraries.length > 0 ? { resourceLibraries: normalizedResourceLibraries.resourceLibraries } : {}),
    ...(parsedGuide.guide ? { characterCreationGuide: parsedGuide.guide } : {}),
  };
  const issues: PackageIssue[] = [];

  collectDuplicateIdIssues(systemPackage.pages, "Page", "DUPLICATE_PAGE_ID", "pages", issues);
  collectDuplicateIdIssues(systemPackage.assets ?? [], "Asset", "DUPLICATE_ASSET_ID", "assets", issues);
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

  const assetRefs = new Set((systemPackage.assets ?? []).flatMap((asset) => [asset.ID, asset.路径]));
  for (const module of systemPackage.modules) {
    if (module.类型 === "readOnlyDisplay" && !module.内容 && !module.资源ID) {
      issues.push({
        level: "error",
        code: "DISPLAY_CONTENT_MISSING",
        text: "ReadOnly Display 需要 内容 或 资源ID。",
        path: `modules.${module.ID}.内容`,
      });
    }

    if (module.类型 === "readOnlyDisplay" && module.资源ID && !assetRefs.has(module.资源ID)) {
      issues.push({
        level: "error",
        code: "MISSING_ASSET_REFERENCE",
        text: `ReadOnly Display 引用了不存在的 Asset：${module.资源ID}`,
        path: `modules.${module.ID}.资源ID`,
      });
    }

    if (module.类型 === "resourcePicker" && !findResourceLibrary(systemPackage, module.资源库ID)) {
      issues.push({
        level: "error",
        code: "MISSING_RESOURCE_LIBRARY_REFERENCE",
        text: `Resource Picker 引用了不存在的 Resource Library：${module.资源库ID}`,
        path: `modules.${module.ID}.资源库ID`,
      });
    }

    if (module.类型 === "cardTable") {
      module.资源库IDs.forEach((libraryId, libraryIndex) => {
        if (!findResourceLibrary(systemPackage, libraryId)) {
          issues.push({
            level: "error",
            code: "MISSING_RESOURCE_LIBRARY_REFERENCE",
            text: `Card Table 引用了不存在的 Resource Library：${libraryId}`,
            path: `modules.${module.ID}.资源库IDs.${libraryIndex}`,
          });
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

  const moduleById = new Map(systemPackage.modules.map((module) => [module.ID, module]));
  const pageById = new Map(systemPackage.pages.map((page) => [page.ID, page]));

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
    } else if (dependency.触发.类型 === "resourceSelected" && sourceModule.类型 !== "resourcePicker") {
      issues.push({
        level: "error",
        code: "UNSUPPORTED_DEPENDENCY_SOURCE_MODULE",
        text: `resourceSelected 触发源必须是 Resource Picker：${dependency.触发.来源模块ID}`,
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
          validateResourceLibraryField(findResourceLibrary(systemPackage, targetModule.资源库ID), action.字段, `dependencies.${dependency.ID}.动作.${actionIndex}.字段`, dependency.ID, targetModule.ID, issues);
        }
      }
    });
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

    if (!targetModule.资源库IDs.includes(module.资源库ID)) {
      issues.push({
        level: "error",
        code: "CARD_TABLE_LIBRARY_MISMATCH",
        text: `Resource Picker 的 Resource Library 不在 Card Table 的资源库IDs中：${module.ID}`,
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

  const cardArtFieldsByLibrary = new Map<string, Set<string>>();
  const cardDefinitionFieldsByLibrary = new Map<string, Set<string>>();
  for (const module of systemPackage.modules) {
    if (module.类型 !== "cardTable") {
      continue;
    }
    for (const libraryId of module.资源库IDs) {
      const artField = module.卡图字段 ?? "卡图";
      const artFields = cardArtFieldsByLibrary.get(libraryId) ?? new Set<string>();
      artFields.add(artField);
      cardArtFieldsByLibrary.set(libraryId, artFields);

      const requiredFields = cardDefinitionFieldsByLibrary.get(libraryId) ?? new Set<string>();
      requiredFields.add(module.卡名字段 ?? "名称");
      requiredFields.add(module.描述字段 ?? "描述");
      cardDefinitionFieldsByLibrary.set(libraryId, requiredFields);
    }
  }

  for (const library of systemPackage.resourceLibraries ?? []) {
    const requiredFields = cardDefinitionFieldsByLibrary.get(library.ID);
    if (requiredFields) {
      library.entries.forEach((entry, entryIndex) => {
        for (const field of requiredFields) {
          if ((entry.fields[field] ?? "").trim() !== "") {
            continue;
          }
          issues.push({
            level: "error",
            code: "CARD_DEFINITION_FIELD_MISSING",
            text: `Card Definition 缺少 Card Table 要求的字段：${field}`,
            path: `resourceLibraries.${library.ID}.entries.${entryIndex}.${field}`,
            evidence: [{ label: "requiredField", value: field }, { label: "resourceEntryId", value: entry.ID }],
          });
        }
      });
    }

    for (const module of systemPackage.modules) {
      if (module.类型 !== "cardTable" || !module.资源库IDs.includes(library.ID)) {
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
    for (const moduleId of getHtmlTemplateModuleReferences(systemPackage.shell.htmlContent)) {
      if (!moduleIds.has(moduleId)) issues.push({ level: "error", code: "MISSING_MODULE_REFERENCE", text: `Sheet Shell 引用了不存在的 Sheet Module：${moduleId}`, path: "shell.html" });
    }
    const outletCount = (systemPackage.shell.htmlContent.match(/<pb-page-outlet\b/gi) ?? []).length;
    if (outletCount !== 1) issues.push({ level: "error", code: "SHELL_PAGE_OUTLET_COUNT_INVALID", text: "Sheet Shell 必须且只能包含一个 pb-page-outlet。", path: "shell.html" });
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
  if (sourceModule?.类型 !== "resourcePicker") return;
  validateResourceLibraryField(findResourceLibrary(systemPackage, sourceModule.资源库ID), field, path, dependencyId, sourceModule.ID, issues);
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

export function validateCachedSystemPackage(input: unknown): CachedPackageValidationResult {
  const cached = systemPackageEnvelopeSchema.safeParse(input);
  const denormalizedInput = cached.success
    ? {
        ...cached.data,
        resourceLibraries: cached.data.resourceLibraries?.map((library) => ({
          ...library,
          entries: Array.isArray(library.entries)
            ? library.entries.map((entry) =>
                isPlainObject(entry) && isPlainObject(entry.fields) ? { ...entry.fields, ID: entry.ID } : entry,
              )
            : library.entries,
        })),
      }
    : input;
  const result = validateSystemPackage(denormalizedInput);
  if (result.ok) {
    return { ok: true, package: result.package };
  }

  return { ok: false, issues: result.issues.map((issue) => ({ ...issue, code: issue.code === "PACKAGE_SHAPE_INVALID" ? "CACHED_PACKAGE_INVALID" : issue.code })) };
}

export function findModule(systemPackage: SystemPackage, moduleId: string): SheetModule | undefined {
  return systemPackage.modules.find((module) => module.ID === moduleId);
}

export function findAsset(systemPackage: SystemPackage, assetId: string): PackageAsset | undefined {
  return systemPackage.assets?.find((asset) => asset.ID === assetId);
}

export function findResourceLibrary(systemPackage: SystemPackage, libraryId: string): ResourceLibrary | undefined {
  return systemPackage.resourceLibraries?.find((library) => library.ID === libraryId);
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
