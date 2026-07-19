import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { zipSync } from "fflate";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

test("Heart of Hopefind exposes the confirmed core character state workflow", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await createHeartOfHopefindPackage(testInfo));

  await expect(page.getByText("寻望之心", { exact: true })).toBeVisible();
  await expect(page.locator('[data-module-id="hope-die"]')).toContainText("D12");
  await page.locator('[data-module-id="hope-die"]').getByRole("button", { name: "希望骰", exact: true }).click();
  await page.getByRole("textbox", { name: "希望骰", exact: true }).fill("D10");
  await expect(page.getByRole("img", { name: "希望点：当前值 2，上限 6" })).toBeVisible();
  await expect(page.locator('[data-module-id="fear-die"]')).toContainText("D12");

  await page.getByRole("checkbox", { name: "噪音状态" }).check();
  await expect(page.locator('[data-module-id="fear-die"]')).toContainText("D20");
  await page.getByRole("checkbox", { name: "噪音状态" }).uncheck();
  await expect(page.locator('[data-module-id="fear-die"]')).toContainText("D12");

  await page.getByRole("button", { name: "选择求生者风格", exact: true }).click();
  await page.getByLabel("选择 孤独").click();
  await page.getByLabel("选择 夜蝠").click();
  await expect(page.locator('[data-module-id="survivor-style-name"]')).toContainText("孤独 / 夜蝠");
  const styleFeatures = page.locator('[data-module-id="survivor-style-features"]');
  await expect(styleFeatures).toContainText("独行智慧");
  await expect(styleFeatures).toContainText("日倦");
  await expect(page.locator('[data-module-type="cardTable"]')).toHaveCount(0);

  const upperLeft = await page.locator(".overview-left").boundingBox();
  const upperRight = await page.locator(".overview-right").boundingBox();
  expect(upperLeft).not.toBeNull();
  expect(upperRight).not.toBeNull();
  expect(upperLeft!.x).toBeLessThan(upperRight!.x);
  await expect(page.locator(".overview-left > .module-slot")).toHaveCount(4);
  await expect(page.locator(".overview-right > *")).toHaveCount(4);
  await expect(page.locator(".character-lower-row")).toHaveCount(2);
  await expect(page.locator(".profession-row")).toHaveCount(5);
  await expect(page.locator(".arc-row")).toHaveCount(5);
  await page.getByRole("textbox", { name: "人物特质", exact: true }).fill("老烟鬼");
  await page.getByRole("textbox", { name: "职业", exact: true }).fill("警察");
  await page.getByPlaceholder("职业关键词1").fill("武器训练");
  await page.getByPlaceholder("弧光1").fill("绝不放弃同伴");
  await expect(page.getByRole("textbox", { name: "背景故事", exact: true })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "携带物资", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "核心伤痛", exact: true })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "核心伤痛", exact: true })).toBeVisible();
  await expect(page.locator(".core-hurt-phases > article")).toHaveCount(4);
  await expect(page.getByRole("img", { name: "起：当前值 0，上限 3" })).toBeVisible();
});

test("Heart of Hopefind uses the same strict A4 geometry on screen and in print", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await createHeartOfHopefindPackage(testInfo));
  const expectedWidth = 210 * 96 / 25.4;
  const expectedHeight = 297 * 96 / 25.4;

  for (const pageId of ["character-sheet"]) {
    const pageBox = page.locator(`[data-template-page-id="${pageId}"]`);
    const screen = await pageGeometry(pageBox);
    await pageBox.screenshot({ path: testInfo.outputPath(`${pageId}-web.png`) });

    await page.emulateMedia({ media: "print" });
    const print = await pageGeometry(pageBox);
    await pageBox.screenshot({ path: testInfo.outputPath(`${pageId}-print.png`) });
    await page.emulateMedia({ media: "screen" });

    expect(screen.width).toBeCloseTo(expectedWidth, 0);
    expect(screen.height).toBeCloseTo(expectedHeight, 0);
    expect(print.width).toBeCloseTo(expectedWidth, 0);
    expect(print.height).toBeCloseTo(expectedHeight, 0);
    expect(screen.widthFits && screen.heightFits, JSON.stringify({ pageId, screen })).toBe(true);
    expect(print.widthFits && print.heightFits, JSON.stringify({ pageId, print })).toBe(true);
    expect(Math.abs(screen.width - print.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(screen.height - print.height)).toBeLessThanOrEqual(1);
    expect(screen.padding).toEqual(print.padding);
    expect(screen.layoutColumns).toBe(print.layoutColumns);
  }
});

test("Heart of Hopefind keeps the A4 layout on a narrow viewport instead of reflowing", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await uploadPackage(page, await createHeartOfHopefindPackage(testInfo));

  const characterPage = page.locator('[data-template-page-id="character-sheet"]');
  const characterGeometry = await pageGeometry(characterPage);
  expect(characterGeometry.width).toBeCloseTo(210 * 96 / 25.4, 0);
  expect(characterGeometry.layoutColumns.trim().split(/\s+/)).toHaveLength(2);
  const phaseColumns = await characterPage.locator(".core-hurt-phases").evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  expect(phaseColumns.trim().split(/\s+/)).toHaveLength(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeGreaterThan(390);
});

async function pageGeometry(locator: ReturnType<Page["locator"]>) {
  return locator.evaluate((element) => {
    const item = element as HTMLElement;
    const rect = item.getBoundingClientRect();
    const style = getComputedStyle(item);
    const layout = item.querySelector<HTMLElement>(".overview-grid, .core-hurt-phases");
    return {
      width: rect.width,
      height: rect.height,
      widthFits: item.scrollWidth <= item.clientWidth + 1,
      heightFits: item.scrollHeight <= item.clientHeight + 1,
      padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft],
      layoutColumns: layout ? getComputedStyle(layout).gridTemplateColumns : "",
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

async function createHeartOfHopefindPackage(testInfo: TestInfo): Promise<string> {
  const packageRoot = path.join(process.cwd(), "public", "system-packages", "heart-of-hopefind");
  const files = Object.fromEntries(await Promise.all((await walkPackageFiles(packageRoot)).map(async (file) => [
    path.relative(packageRoot, file).replaceAll("\\", "/"),
    await readFile(file),
  ])));
  const packagePath = path.join(testInfo.outputDir, "heart-of-hopefind.zip");
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
