import { describe, expect, it } from "vitest";
import { minimalSystemPackage, moduleDemoSystemPackage } from "../test/fixtures";
import { findAsset, findModule, findResourceLibrary, getHtmlTemplateModuleReferences, validateSystemPackage } from "./systemPackage";

describe("validateSystemPackage", () => {
  it("accepts the minimal demo System Package", () => {
    const result = validateSystemPackage(minimalSystemPackage);

    expect(result.ok).toBe(true);
  });

  it("does not warn when the schemaVersion matches the framework version", () => {
    const result = validateSystemPackage(minimalSystemPackage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issues).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ code: "SCHEMA_VERSION_MISMATCH" })]),
      );
    }
  });

  it("warns but still renders when the schemaVersion differs from the framework version", () => {
    const mismatchedPackage = {
      ...minimalSystemPackage,
      manifest: { ...minimalSystemPackage.manifest, schemaVersion: "0.2.0" },
    };

    const result = validateSystemPackage(mismatchedPackage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "SCHEMA_VERSION_MISMATCH", level: "warning" }),
        ]),
      );
    }
  });

  it("accepts the phase 5 simple Sheet Module set", () => {
    const result = validateSystemPackage(moduleDemoSystemPackage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(findModule(result.package, "background")?.类型).toBe("longText");
      expect(findModule(result.package, "conditions")?.类型).toBe("checkboxResource");
      expect(findModule(result.package, "vitality")?.类型).toBe("countableResource");
      expect(findModule(result.package, "rule-note")?.类型).toBe("readOnlyDisplay");
      expect(findModule(result.package, "sect-emblem")?.类型).toBe("readOnlyDisplay");
      expect(findModule(result.package, "portrait")?.类型).toBe("imageField");
      expect(findAsset(result.package, "demo-emblem")?.路径).toBe("assets/demo-emblem.svg");
    }
  });

  it("accepts HTML Layout Template module placeholders", () => {
    const result = validateSystemPackage(moduleDemoSystemPackage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const html = result.package.pages[0].layout.htmlContent;
      expect(getHtmlTemplateModuleReferences(html)).toEqual([
        "character-name",
        "portrait",
        "sect-emblem",
        "vitality",
        "conditions",
        "background",
        "rule-note",
      ]);
    }
  });

  it("reports missing read-only display asset references", () => {
    const invalidPackage = {
      ...moduleDemoSystemPackage,
      modules: moduleDemoSystemPackage.modules.map((module) =>
        module.ID === "sect-emblem" ? { ...module, 资源ID: "missing-asset" } : module,
      ),
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_ASSET_REFERENCE",
          level: "error",
        }),
      ]),
    );
  });

  it("accepts Resource Libraries, Resource Picker references, and dependency fill rules", () => {
    const packageWithSelection = {
      ...minimalSystemPackage,
      resourceLibraries: [
        {
          ID: "domains",
          名称: "领域",
          路径: "resources/domains.json",
          entries: [
            { ID: "blade-1", 名称: "利刃一", 领域: "利刃", 等级: "1" },
            { ID: "bone-1", 名称: "骸骨一", 领域: "骸骨" },
          ],
        },
      ],
      modules: [
        ...minimalSystemPackage.modules,
        {
          ID: "domain-pick",
          类型: "resourcePicker",
          按钮文本: "选择领域",
          资源库ID: "domains",
          字段模板: [
            { 键: "名称", 标签: "卡名", 默认显示: true, 可筛选: false, 可排序: true },
            { 键: "领域", 标签: "领域", 默认显示: true, 可筛选: true, 可排序: true },
          ],
        },
        {
          ID: "domain-name",
          类型: "freeText",
          标签: "领域名",
        },
      ],
      dependencies: [
        {
          ID: "fill-domain",
          sources: [{ 类型: "resourcePicker", 模块ID: "domain-pick" }],
          targets: [{ 类型: "module", 模块ID: "domain-name" }],
          触发: { 类型: "resourceSelected", 来源模块ID: "domain-pick" },
          条件: { 类型: "always" },
          动作: [{ 类型: "fillText", 目标模块ID: "domain-name", 内容: { 类型: "selectedResourceField", 字段: "名称" } }],
        },
      ],
      pages: [
        {
          ...minimalSystemPackage.pages[0],
          layout: {
            ...minimalSystemPackage.pages[0].layout,
            htmlContent: `${minimalSystemPackage.pages[0].layout.htmlContent}<pb-module id="domain-pick"></pb-module><pb-module id="domain-name"></pb-module>`,
          },
        },
      ],
    };

    const result = validateSystemPackage(packageWithSelection);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const module = findModule(result.package, "domain-pick");
      expect(module?.类型).toBe("resourcePicker");
      if (module?.类型 === "resourcePicker") {
        expect(module.字段模板?.map((field) => field.键)).toEqual(["名称", "领域"]);
      }
      expect(findResourceLibrary(result.package, "domains")?.entries[1].fields.等级).toBe("");
      expect(result.package.dependencies?.[0].动作[0].目标模块ID).toBe("domain-name");
      expect(result.package.dependencies?.[0].sources[0]).toEqual({ 类型: "resourcePicker", 模块ID: "domain-pick" });
    }
  });

  it("reports missing Resource Library references for Resource Picker", () => {
    const invalidPackage = {
      ...minimalSystemPackage,
      modules: [
        {
          ID: "choice",
          类型: "resourcePicker",
          按钮文本: "选择",
          资源库ID: "missing-library",
        },
      ],
      pages: [
        {
          ...minimalSystemPackage.pages[0],
          layout: {
            ...minimalSystemPackage.pages[0].layout,
            htmlContent: '<main><pb-module id="choice"></pb-module></main>',
          },
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_RESOURCE_LIBRARY_REFERENCE",
          level: "error",
          path: "modules.choice.资源库ID",
        }),
      ]),
    );
  });

  it("reports invalid Resource Picker dependency references", () => {
    const invalidPackage = {
      ...minimalSystemPackage,
      modules: [
        ...minimalSystemPackage.modules,
        {
          ID: "pick",
          类型: "resourcePicker",
          按钮文本: "选择",
          资源库ID: "domains",
        },
        {
          ID: "image-target",
          类型: "imageField",
          标签: "图片",
        },
      ],
      resourceLibraries: [{ ID: "domains", 名称: "领域", 路径: "resources/domains.json", entries: [{ ID: "x" }] }],
      dependencies: [
        {
          ID: "bad-target",
          sources: [{ 类型: "resourcePicker", 模块ID: "pick" }],
          targets: [{ 类型: "module", 模块ID: "image-target" }],
          触发: { 类型: "resourceSelected", 来源模块ID: "pick" },
          条件: { 类型: "always" },
          动作: [{ 类型: "fillText", 目标模块ID: "image-target", 内容: { 类型: "selectedResourceField", 字段: "名称" } }],
        },
      ],
      pages: [
        {
          ...minimalSystemPackage.pages[0],
          layout: {
            ...minimalSystemPackage.pages[0].layout,
            htmlContent: `${minimalSystemPackage.pages[0].layout.htmlContent}<pb-module id="pick"></pb-module><pb-module id="image-target"></pb-module>`,
          },
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNSUPPORTED_DEPENDENCY_TARGET_MODULE",
          level: "error",
        }),
      ]),
    );
  });

  it("reports unsupported countableResource dependency triggers clearly", () => {
    const invalidPackage = {
      ...minimalSystemPackage,
      modules: [
        ...minimalSystemPackage.modules,
        {
          ID: "vitality",
          类型: "countableResource",
          标签: "气力",
        },
        {
          ID: "note",
          类型: "freeText",
          标签: "提示",
        },
      ],
      dependencies: [
        {
          ID: "bad-counter",
          sources: [{ 类型: "countableResource", 模块ID: "vitality" }],
          targets: [{ 类型: "module", 模块ID: "note" }],
          触发: { 类型: "countableChanged", 来源模块ID: "vitality" },
          条件: { 类型: "always" },
          动作: [{ 类型: "fillText", 目标模块ID: "note", 内容: "不支持" }],
        },
      ],
      pages: [
        {
          ...minimalSystemPackage.pages[0],
          layout: {
            ...minimalSystemPackage.pages[0].layout,
            htmlContent: `${minimalSystemPackage.pages[0].layout.htmlContent}<pb-module id="vitality"></pb-module><pb-module id="note"></pb-module>`,
          },
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNSUPPORTED_DEPENDENCY_TRIGGER",
          level: "error",
        }),
      ]),
    );
  });

  it("reports a clear error for unsupported Sheet Module types", () => {
    const invalidPackage = {
      ...minimalSystemPackage,
      modules: [
        {
          ID: "choice",
          类型: "customWidget",
          标签: "暂不支持",
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNSUPPORTED_MODULE_TYPE",
          level: "error",
          path: "modules.0.类型",
        }),
      ]),
    );
  });

  it("reports a visible error for a missing Sheet Module reference in HTML Layout Template", () => {
    const invalidPackage = {
      ...minimalSystemPackage,
      pages: [
        {
          ...minimalSystemPackage.pages[0],
          layout: {
            ...minimalSystemPackage.pages[0].layout,
            htmlContent: "<main><pb-module id=\"missing-module\"></pb-module></main>",
          },
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_MODULE_REFERENCE",
          level: "error",
        }),
      ]),
    );
  });

  it("rejects custom form controls inside HTML Layout Template", () => {
    const invalidPackage = {
      ...moduleDemoSystemPackage,
      pages: [
        {
          ...moduleDemoSystemPackage.pages[0],
          layout: {
            ...moduleDemoSystemPackage.pages[0].layout,
            htmlContent: "<main><input value=\"bad\" /></main>",
          },
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "HTML_TEMPLATE_FORBIDDEN_TAG",
          level: "error",
        }),
      ]),
    );
  });

  it("rejects event handler attributes inside HTML Layout Template", () => {
    const invalidPackage = {
      ...moduleDemoSystemPackage,
      pages: [
        {
          ...moduleDemoSystemPackage.pages[0],
          layout: {
            ...moduleDemoSystemPackage.pages[0].layout,
            htmlContent: "<main><section onclick=\"bad()\"><pb-module id=\"character-name\"></pb-module></section></main>",
          },
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "HTML_TEMPLATE_FORBIDDEN_EVENT_HANDLER",
          level: "error",
        }),
      ]),
    );
  });

  it("rejects unsupported tags and attributes inside HTML Layout Template", () => {
    const invalidPackage = {
      ...moduleDemoSystemPackage,
      pages: [
        {
          ...moduleDemoSystemPackage.pages[0],
          layout: {
            ...moduleDemoSystemPackage.pages[0].layout,
            htmlContent: "<main><label style=\"display:grid\"><pb-module></pb-module></label></main>",
          },
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "HTML_TEMPLATE_UNSUPPORTED_TAG",
          level: "error",
        }),
        expect.objectContaining({
          code: "HTML_TEMPLATE_UNSUPPORTED_ATTRIBUTE",
          level: "error",
        }),
        expect.objectContaining({
          code: "HTML_TEMPLATE_MODULE_ID_MISSING",
          level: "error",
        }),
      ]),
    );
  });

  it("rejects external resources in HTML Layout Template and CSS", () => {
    const invalidPackage = {
      ...moduleDemoSystemPackage,
      pages: [
        {
          ...moduleDemoSystemPackage.pages[0],
          layout: {
            ...moduleDemoSystemPackage.pages[0].layout,
            htmlContent: "<main><img src=\"https://example.com/bad.png\" alt=\"bad\" /></main>",
            cssContent: "@import url(\"https://example.com/bad.css\"); .demo { background-image: url(/bad.png); }",
          },
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "HTML_TEMPLATE_EXTERNAL_RESOURCE",
          level: "error",
        }),
        expect.objectContaining({
          code: "CSS_TEMPLATE_IMPORT_FORBIDDEN",
          level: "error",
        }),
        expect.objectContaining({
          code: "CSS_TEMPLATE_EXTERNAL_RESOURCE",
          level: "error",
        }),
      ]),
    );
  });
});
