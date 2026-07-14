import { describe, expect, it } from "vitest";
import { collectFrameworkValidationIssues } from "./frameworkChecks";

describe("Framework Checks", () => {
  it("reports overflowing Long Text and Card descriptions as framework warnings", () => {
    const root = document.createElement("main");
    root.innerHTML = `
      <div data-module-id="inventory" data-module-type="longText">
        <div data-text-fit="overflow"></div>
      </div>
      <div data-module-id="character-name" data-module-type="freeText">
        <div data-text-fit="overflow"></div>
      </div>
      <article data-card-instance-id="card-1" aria-label="漫长咒文">
        <div class="play-card-description" data-text-fit="overflow"></div>
      </article>
      <div data-module-id="notes" data-module-type="longText">
        <div data-text-fit="fitted"></div>
      </div>
    `;

    expect(collectFrameworkValidationIssues(root)).toEqual([
      {
        level: "warning",
        code: "TEXT_CONTENT_OVERFLOW",
        text: "Long Text 内容在最低字号下仍超出固定高度，可滚动查看或精简内容。",
        path: "character.values.inventory",
        source: "framework",
      },
      {
        level: "warning",
        code: "TEXT_CONTENT_OVERFLOW",
        text: "Free Text 内容在最低字号下仍超出单行宽度，可进入编辑查看或精简内容。",
        path: "character.values.character-name",
        source: "framework",
      },
      {
        level: "warning",
        code: "TEXT_CONTENT_OVERFLOW",
        text: "Card 漫长咒文的描述在最低字号下仍被截断，可打开详情查看或精简内容。",
        path: "cards.instances.card-1",
        source: "framework",
      },
    ]);
  });
});
