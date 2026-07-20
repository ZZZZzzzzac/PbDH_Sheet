import { describe, expect, it } from "vitest";
import { minimalSystemPackage, moduleDemoSystemPackage } from "../test/fixtures";
import { findAsset, findModule, findResourceLibrary, getHtmlTemplateModuleReferences, validateCachedSystemPackage, validateSystemPackage } from "./systemPackage";

describe("validateSystemPackage Skins", () => {
  it("accepts bundled CSS-only System Package Skins with one valid default", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      defaultSkin: "plain",
      skins: [
        { ID: "plain", 名称: "简洁", cssContent: ".demo { color: #202426; }", 推荐框架配色: "light" },
        { ID: "night", 名称: "夜间", cssContent: ".demo { color: #f5f2ea; }", 推荐框架配色: "dark" },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.package.defaultSkin).toBe("plain");
      expect(result.package.skins?.map((skin) => skin.ID)).toEqual(["plain", "night"]);
    }
  });

  it("rejects duplicate Skin IDs and an unknown default Skin", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      defaultSkin: "missing",
      skins: [
        { ID: "same", 名称: "甲", cssContent: ".demo { color: black; }", 推荐框架配色: "light" },
        { ID: "same", 名称: "乙", cssContent: ".demo { color: white; }", 推荐框架配色: "dark" },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "DUPLICATE_SKIN_ID", level: "error" }),
      expect.objectContaining({ code: "MISSING_DEFAULT_SKIN_REFERENCE", level: "error" }),
    ]));
  });

  it("validates Skin CSS images and rejects bundled font declarations", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      defaultSkin: "bad",
      skins: [{
        ID: "bad",
        名称: "错误皮肤",
        cssContent: '@font-face { font-family: "Bad"; src: url("assets/missing.woff2"); } .demo { background: url("assets/missing.png"); }',
        推荐框架配色: "light",
      }],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "CSS_TEMPLATE_FONT_FACE_FORBIDDEN", level: "error" }),
      expect.objectContaining({ code: "MISSING_TEMPLATE_IMAGE_REFERENCE", path: "skins.bad.css" }),
    ]));
  });

  it("accepts a partial Skin Page HTML override with unchanged module ownership", () => {
    const basePage = minimalSystemPackage.pages[0];
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      defaultSkin: "editorial",
      skins: [{
        ID: "editorial",
        名称: "编排版",
        cssContent: ".editorial { display: grid; }",
        推荐框架配色: "light",
        layoutOverrides: {
          pages: [{
            ID: basePage.ID,
            htmlContent: '<main class="editorial"><h2>静态标题</h2><pb-module id="character-name"></pb-module></main>',
          }],
        },
      }],
    });

    expect(result.ok).toBe(true);
  });

  it("rejects Skin HTML overrides that change Page module ownership", () => {
    const basePage = minimalSystemPackage.pages[0];
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      defaultSkin: "broken",
      skins: [{
        ID: "broken",
        名称: "错误布局",
        cssContent: ".broken { display: grid; }",
        推荐框架配色: "light",
        layoutOverrides: { pages: [{ ID: basePage.ID, htmlContent: "<main><h2>遗漏模块</h2></main>" }] },
      }],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "SKIN_LAYOUT_MODULE_OWNERSHIP_MISMATCH", path: `skins.broken.layoutOverrides.pages.${basePage.ID}.html` }),
    ]));
  });

  it("rejects Skin HTML overrides for unknown Pages", () => {
    const result = validateSystemPackage({
      ...minimalSystemPackage,
      defaultSkin: "broken",
      skins: [{
        ID: "broken",
        名称: "错误布局",
        cssContent: ".broken { display: grid; }",
        推荐框架配色: "light",
        layoutOverrides: { pages: [{ ID: "missing-page", htmlContent: "<main></main>" }] },
      }],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "SKIN_LAYOUT_OVERRIDE_PAGE_UNKNOWN", path: "skins.broken.layoutOverrides.pages.missing-page.ID" }),
    ]));
  });
});
