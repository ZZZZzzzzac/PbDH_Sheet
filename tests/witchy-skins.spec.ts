import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { zipSync } from "fflate";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

test("every Witchy skin keeps the sheet inside one A4 page when printing", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await createWitchyPackage(testInfo));

  const skinSelect = page.getByRole("combobox", { name: /^人物卡皮肤/ });
  await expect(skinSelect.locator('option[value="witching-hour"]')).toHaveCount(1);
  const skinIds = await skinSelect.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  expect(skinIds.length).toBeGreaterThan(0);

  for (const skinId of skinIds) {
    await page.emulateMedia({ media: "screen" });
    await skinSelect.selectOption(skinId);
    await page.emulateMedia({ media: "print" });
    const probe = await page.locator(".sheet-page").evaluate((item) => ({
      widthFits: item.scrollWidth <= item.clientWidth + 1,
      heightFits: item.scrollHeight <= item.clientHeight + 1,
      clientHeight: item.clientHeight,
      scrollHeight: item.scrollHeight,
      regions: Object.fromEntries([
        ".witching-title", ".sheet-content-grid", ".sheet-column:first-child", ".sheet-column:last-child",
        ".character-summary", ".archetype-panel", ".experience-panel", ".inventory-panel",
        ".resource-panel", ".magic-panel", ".familiar-panel", ".omen-panel",
      ].map((selector) => {
        const region = item.querySelector<HTMLElement>(selector);
        return [selector, region ? Math.round(region.getBoundingClientRect().height) : null];
      })),
      ratio: (() => { const rect = item.getBoundingClientRect(); return rect.width / rect.height; })(),
    }));
    expect(probe.widthFits && probe.heightFits, `${skinId}: ${JSON.stringify(probe)}`).toBe(true);
    expect(probe.ratio, skinId).toBeCloseTo(210 / 297, 2);
  }
});

test("Witching Hour uses the same page width and layout when printing", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await createWitchyPackage(testInfo));

  const skinSelect = page.getByRole("combobox", { name: /^人物卡皮肤/ });
  await expect(skinSelect.locator('option[value="witching-hour"]')).toHaveCount(1);
  await skinSelect.selectOption("witching-hour");
  await expect(page.locator('[data-module-id="magic-4-name"], [data-module-id="magic-4-description"]')).toHaveCount(0);

  const screen = await witchingHourPresentation(page);
  await page.emulateMedia({ media: "print" });
  const print = await witchingHourPresentation(page);

  expect(Math.abs(print.pageWidth - screen.pageWidth)).toBeLessThanOrEqual(1);
  expect(print.pagePadding).toBe(screen.pagePadding);
  expect(screen.sheetPadding).toBe("0px");
  expect(print.sheetPadding).toBe(screen.sheetPadding);
  expect(screen.leftColumnShare).toBeCloseTo(0.65, 2);
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

async function uploadPackage(page: Page, packagePath: string) {
  await page.getByRole("button", { name: "系统包", exact: true }).click();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /System Package zip/ }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(packagePath);
}

async function createWitchyPackage(testInfo: TestInfo): Promise<string> {
  const packageRoot = path.join(process.cwd(), "public", "system-packages", "witchy");
  const files = Object.fromEntries(await Promise.all((await walkPackageFiles(packageRoot)).map(async (file) => [
    path.relative(packageRoot, file).replaceAll("\\", "/"), await readFile(file),
  ])));
  const packagePath = path.join(testInfo.outputDir, "witchy.zip");
  await mkdir(testInfo.outputDir, { recursive: true });
  await writeFile(packagePath, zipSync(files));
  return packagePath;
}

async function walkPackageFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkPackageFiles(entryPath) : [entryPath];
  }))).flat();
}
