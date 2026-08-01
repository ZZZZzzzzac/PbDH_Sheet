import type { SystemPackage } from "../domain/systemPackage";
import { minimalSystemPackage } from "./fixtures";

export function createCardTablePackage(): SystemPackage {
  return {
    ...minimalSystemPackage,
    pages: [
      {
        ID: "print-card-page",
        名称: "Print Cards",
        layout: {
          类型: "htmlTemplate",
          html: "layouts/print-cards.html",
          htmlContent: '<pb-module id="print-card-table"></pb-module>',
        },
      },
    ],
    modules: [
      {
        ID: "print-card-table",
        类型: "cardTable",
        标签: "打印卡牌桌面",
        资源来源: [{ 类型: "resourceLibrary", ID: "print-cards" }],
      },
    ],
    resourceLibraries: [
      {
        ID: "print-cards",
        名称: "打印卡牌",
        路径: "resources/print-cards.json",
        fields: [],
        entries: [],
      },
    ],
  };
}
