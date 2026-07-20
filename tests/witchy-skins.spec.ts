import { expect, test, type Page } from "@playwright/test";

test("Witching Hour uses the same page width and layout when printing", async ({ page }) => {
  await page.goto("/");
  await selectWitchyPreset(page);

  const skinSelect = page.getByRole("combobox", { name: /^人物卡皮肤/ });
  await expect(skinSelect.locator('option[value="witching-hour"]')).toHaveCount(1);
  await skinSelect.selectOption("witching-hour");
  await expect(page.locator('[data-module-id="magic-4-name"], [data-module-id="magic-4-description"]')).toHaveCount(0);

  const screen = await witchingHourPresentation(page);
  await page.emulateMedia({ media: "print" });
  const print = await witchingHourPresentation(page);

  expect(Math.abs(print.pageWidth - screen.pageWidth)).toBeLessThanOrEqual(1);
  expect(print.pagePadding).toBe(screen.pagePadding);
  expect(screen.sheetPadding).not.toBe("0px");
  expect(print.sheetPadding).toBe(screen.sheetPadding);
  expect(screen.leftColumnShare).toBeCloseTo(0.5, 2);
  expect(print.leftColumnShare).toBeCloseTo(screen.leftColumnShare, 2);
  expect(screen.resourcesStacked).toBe(true);
  expect(print.resourcesStacked).toBe(true);
  expect(screen.pickersHidden).toBe(false);
  expect(print.pickersHidden).toBe(true);
  expect(print.pickerFieldsExpanded).toBe(true);
  expect(print.titleFlexWrap).toBe(screen.titleFlexWrap);
  expect(print.titlePadding).toBe(screen.titlePadding);
  expect(print.panelTitleDisplay).toBe(screen.panelTitleDisplay);
});

async function witchingHourPresentation(page: Page) {
  return page.locator(".sheet-page").evaluate((sheetPage) => {
    const title = sheetPage.querySelector<HTMLElement>(".witching-title")!;
    const panelTitle = sheetPage.querySelector<HTMLElement>(".panel-title")!;
    const witchSheet = sheetPage.querySelector<HTMLElement>(".witching-hour-sheet")!;
    const columns = [...sheetPage.querySelectorAll<HTMLElement>(".sheet-content-grid > .sheet-column")];
    const magicPoints = sheetPage.querySelector<HTMLElement>('[data-module-slot-id="magic-points"]')!.getBoundingClientRect();
    const erosion = sheetPage.querySelector<HTMLElement>('[data-module-slot-id="erosion"]')!.getBoundingClientRect();
    const pickerIds = ["pick-archetype", "pick-familiar-type"];
    const pickers = pickerIds.map((id) => sheetPage.querySelector<HTMLElement>(`[data-module-id="${id}"]`)!);
    const pickerFieldsExpanded = ["archetype-name", "familiar-type-name"].every((id) => {
      const field = sheetPage.querySelector<HTMLElement>(`[data-module-slot-id="${id}"]`)!;
      const container = field.closest<HTMLElement>(".picker-field")!;
      return Math.abs(field.getBoundingClientRect().width - container.getBoundingClientRect().width) <= 1;
    });
    const columnWidths = columns.map((column) => column.getBoundingClientRect().width);
    const pageStyle = getComputedStyle(sheetPage);
    const titleStyle = getComputedStyle(title);
    return {
      pageWidth: sheetPage.getBoundingClientRect().width,
      pagePadding: pageStyle.padding,
      sheetPadding: getComputedStyle(witchSheet).padding,
      leftColumnShare: columnWidths[0] / (columnWidths[0] + columnWidths[1]),
      resourcesStacked: Math.abs(magicPoints.left - erosion.left) <= 1 && erosion.top >= magicPoints.bottom,
      pickersHidden: pickers.every((picker) => getComputedStyle(picker).display === "none"),
      pickerFieldsExpanded,
      titleFlexWrap: titleStyle.flexWrap,
      titlePadding: titleStyle.padding,
      panelTitleDisplay: getComputedStyle(panelTitle).display,
    };
  });
}

async function selectWitchyPreset(page: Page) {
  await page.getByRole("button", { name: "系统包", exact: true }).click();
  await page.getByRole("combobox", { name: "预制系统包" }).selectOption("witchy-omega-1");
  await expect(page.locator('[data-system-package-id="witchy-omega-1"]')).toBeVisible();
}
