import type { SystemPackage } from "../domain/systemPackage";
import manifest from "../../public/system-packages/demo-minimal/manifest.json";
import pages from "../../public/system-packages/demo-minimal/pages.json";
import modules from "../../public/system-packages/demo-minimal/modules.json";
import minimalLayoutCss from "../../public/system-packages/demo-minimal/layouts/main.css?raw";
import minimalLayoutHtml from "../../public/system-packages/demo-minimal/layouts/main.html?raw";

function withHtmlTemplateContent<TPage extends { layout: { 类型: string; html: string; css?: string } }>(
  pagesInput: TPage[],
  htmlContent: string,
  cssContent?: string,
) {
  return pagesInput.map((page) => ({
    ...page,
    layout: {
      类型: "htmlTemplate" as const,
      htmlContent,
      ...(cssContent ? { cssContent } : {}),
    },
  }));
}

export const minimalSystemPackage = {
  manifest: {
    ID: manifest.ID,
    名称: manifest.名称,
    版本: manifest.版本,
    schemaVersion: manifest.schemaVersion,
  },
  pages: withHtmlTemplateContent(pages, minimalLayoutHtml, minimalLayoutCss),
  modules,
} as SystemPackage;

export const moduleDemoSystemPackage = {
  manifest: {
    ID: "demo",
    名称: "模块测试夹具",
    版本: "0.1.0",
    schemaVersion: "0.1.0",
  },
  pages: [{
    ID: "main",
    名称: "模块测试",
    layout: {
      类型: "htmlTemplate",
      htmlContent: `<main class="demo-sheet">
        <section class="identity">
          <pb-module id="character-name"></pb-module>
          <pb-module id="portrait"></pb-module>
          <pb-module id="sect-emblem"></pb-module>
        </section>
        <section class="state">
          <pb-module id="vitality"></pb-module>
          <pb-module id="conditions"></pb-module>
        </section>
        <section class="notes">
          <pb-module id="background"></pb-module>
          <pb-module id="rule-note"></pb-module>
        </section>
      </main>`,
      cssContent: ".identity { display: grid; grid-template-columns: 2fr 180px 1fr; }",
    },
  }],
  modules: [
    { ID: "character-name", 类型: "freeText", 标签: "姓名", 默认值: "" },
    { ID: "background", 类型: "longText", 标签: "背景", 默认值: "写下角色的来历。", 行数: 5 },
    {
      ID: "conditions", 类型: "checkboxResource", 标签: "标记", 选项: [
        { ID: "wounded", 标签: "受伤" },
        { ID: "exhausted", 标签: "力竭" },
        { ID: "inspired", 标签: "振奋", 默认选中: true },
      ],
    },
    { ID: "vitality", 类型: "countableResource", 标签: "气力", 最小值: 0, 最大值: 6, 默认值: 3, 步长: 1, 最大值可改: true, 标识字号: 18, 加减号字号: 20 },
    { ID: "rule-note", 类型: "readOnlyDisplay", 标签: "提示", 内容: "只读展示模块不会写入 Character Data。这里适合放规则提示、检查清单或静态说明。" },
    { ID: "sect-emblem", 类型: "readOnlyDisplay", 标签: "徽记", 资源路径: "assets/demo-emblem.svg", 替代文本: "阶段5示例徽记" },
    { ID: "portrait", 类型: "imageField", 标签: "头像", 替代文本: "角色头像" },
  ],
  assets: [{ 路径: "assets/demo-emblem.svg", 类型: "image/svg+xml" }],
} as SystemPackage;
