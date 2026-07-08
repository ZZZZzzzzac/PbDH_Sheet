import { describe, expect, it } from "vitest";
import { minimalSystemPackage, moduleDemoSystemPackage } from "../test/fixtures";
import { findAsset, findModule, getHtmlTemplateModuleReferences, validateSystemPackage } from "./systemPackage";

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

  it("reports a clear error for unsupported Sheet Module types", () => {
    const invalidPackage = {
      ...minimalSystemPackage,
      modules: [
        {
          ID: "choice",
          类型: "selectionText",
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
