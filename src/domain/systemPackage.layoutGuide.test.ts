import { describe, expect, it } from "vitest";
import { minimalSystemPackage, moduleDemoSystemPackage } from "../test/fixtures";
import { findAsset, findModule, findResourceLibrary, getHtmlTemplateModuleReferences, validateCachedSystemPackage, validateSystemPackage } from "./systemPackage";

describe("validateSystemPackage Layout and Guide", () => {
  it("accepts a Sheet Shell with one Page Outlet and persistent module references", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      shell: { 类型: "htmlTemplate", htmlContent: '<main><pb-page-outlet></pb-page-outlet><pb-module id="character-name"></pb-module></main>' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.package.shell?.htmlContent).toContain("pb-page-outlet");
  });

  it("rejects a Sheet Shell without exactly one Page Outlet", () => {
    const result = validateSystemPackage({ ...minimalSystemPackage, shell: { 类型: "htmlTemplate", htmlContent: "<main></main>" } });
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SHELL_PAGE_OUTLET_COUNT_INVALID" })]));
  });

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
      manifest: { ...minimalSystemPackage.manifest, schemaVersion: "0.1.0" },
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

  it("accepts a linear Character Creation Guide with no, module, page, and region targets", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      pages: [{
        ...minimalSystemPackage.pages[0],
        layout: {
          ...minimalSystemPackage.pages[0].layout,
          htmlContent: '<section data-guide-region-id="identity"><pb-module id="character-name"></pb-module></section>',
        },
      }],
      characterCreationGuide: {
        步骤: [
          { ID: "intro", 标题: "开始", 说明: "先认识角色卡。" },
          { ID: "name", 标题: "姓名", 说明: "填写姓名。", 目标: { 类型: "module", 模块ID: "character-name" } },
          { ID: "page", 标题: "角色页", 说明: "这是角色页。", 目标: { 类型: "page", 页面ID: "main" } },
          { ID: "identity", 标题: "身份", 说明: "填写身份资料。", 目标: { 类型: "region", 区域ID: "identity" } },
        ],
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.package.characterCreationGuide?.步骤).toHaveLength(4);
    }
  });

  it("reports invalid Guide structure as an error", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      characterCreationGuide: { 步骤: [] },
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "INVALID_CHARACTER_CREATION_GUIDE", level: "error" })]),
    );
  });

  it("reports an empty Layout Region ID", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      pages: [{
        ...minimalSystemPackage.pages[0],
        layout: {
          ...minimalSystemPackage.pages[0].layout,
          htmlContent: '<section data-guide-region-id=""><pb-module id="character-name"></pb-module></section>',
        },
      }],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "GUIDE_REGION_ID_EMPTY", level: "error" })]),
    );
  });

  it("reports duplicate Layout Region IDs across pages", () => {
    const regionLayout = {
      ...minimalSystemPackage.pages[0].layout,
      htmlContent: '<section data-guide-region-id="identity"></section>',
    };
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      pages: [
        { ...minimalSystemPackage.pages[0], layout: regionLayout },
        { ...minimalSystemPackage.pages[0], ID: "second", 名称: "第二页", layout: regionLayout },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "DUPLICATE_GUIDE_REGION_ID", level: "error" })]),
    );
  });

  it("reports duplicate Guide Step IDs and missing targets", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      characterCreationGuide: {
        步骤: [
          { ID: "same", 标题: "一", 说明: "一", 目标: { 类型: "module", 模块ID: "missing-module" } },
          { ID: "same", 标题: "二", 说明: "二", 目标: { 类型: "page", 页面ID: "missing-page" } },
          { ID: "region", 标题: "三", 说明: "三", 目标: { 类型: "region", 区域ID: "missing-region" } },
        ],
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATE_GUIDE_STEP_ID", level: "error" }),
        expect.objectContaining({ code: "MISSING_GUIDE_TARGET_MODULE", level: "error" }),
        expect.objectContaining({ code: "MISSING_GUIDE_TARGET_PAGE", level: "error" }),
        expect.objectContaining({ code: "MISSING_GUIDE_TARGET_REGION", level: "error" }),
      ]),
    );
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
