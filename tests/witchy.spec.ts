import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { zipSync } from "fflate";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

test("Witchy creates, saves, reloads, and prints one centered A4 character sheet", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await createWitchyPackage(testInfo));

  await expect(page.getByText("ω1.0 女巫人物卡")).toBeVisible();
  const identityBox = await page.locator(".character-summary").boundingBox();
  const resourceBox = await page.locator(".resource-panel").boundingBox();
  const nameBox = await page.locator('[data-module-slot-id="character-name"]').boundingBox();
  const portraitBox = await page.locator('[data-module-slot-id="character-portrait"]').boundingBox();
  const essenceBox = await page.locator(".essence-panel").boundingBox();
  const magicPointsBox = await page.locator('[data-module-slot-id="magic-points"]').boundingBox();
  expect(identityBox).not.toBeNull();
  expect(resourceBox).not.toBeNull();
  expect(nameBox).not.toBeNull();
  expect(portraitBox).not.toBeNull();
  expect(essenceBox).not.toBeNull();
  expect(magicPointsBox).not.toBeNull();
  const screenPortraitShare = portraitBox!.width / identityBox!.width;
  expect(identityBox!.x).toBeLessThan(resourceBox!.x);
  expect(portraitBox!.x).toBeLessThan(nameBox!.x);
  const identityTerminalPanelBox = await page.locator(".identity-terminal-panel").boundingBox();
  expect(identityTerminalPanelBox).not.toBeNull();
  expect(Math.abs(portraitBox!.y - identityTerminalPanelBox!.y)).toBeLessThanOrEqual(2);
  expect(nameBox!.y).toBeGreaterThan(identityTerminalPanelBox!.y);
  const archetypeRulesBox = await page.locator('[data-module-slot-id="archetype-description"]').boundingBox();
  expect(archetypeRulesBox).not.toBeNull();
  expect(Math.abs(portraitBox!.y + portraitBox!.height - (identityTerminalPanelBox!.y + identityTerminalPanelBox!.height))).toBeLessThanOrEqual(2);
  const identityContainerClass = await page.locator('[data-module-slot-id="character-name"]').evaluate((node) => node.closest(".identity-terminal-panel")?.className);
  expect(identityContainerClass).toContain("sheet-region");
  await expect(page.getByRole("heading", { name: "创造你的魔法" })).toHaveCount(0);
  await expect(page.locator(".resource-panel")).toHaveClass(/sheet-region/);
  expect(essenceBox!.y).toBeGreaterThan(resourceBox!.y);
  expect(magicPointsBox!.y).toBeGreaterThanOrEqual(essenceBox!.y + essenceBox!.height);
  expect(magicPointsBox!.y + magicPointsBox!.height).toBeLessThan(resourceBox!.y + resourceBox!.height);
  await expectPickerAfterField(page, "archetype-name", "pick-archetype");
  await expectPickerAfterField(page, "familiar-type-name", "pick-familiar-type");
  const familiarPortrait = await page.locator('[data-module-slot-id="familiar-portrait"]').boundingBox();
  const familiarName = await page.locator('[data-module-slot-id="familiar-name"]').boundingBox();
  const familiarTrickRules = await page.locator('[data-module-slot-id="familiar-type-description"]').boundingBox();
  expect(familiarPortrait).not.toBeNull();
  expect(familiarName).not.toBeNull();
  expect(familiarTrickRules).not.toBeNull();
  expect(familiarPortrait!.x).toBeLessThan(familiarName!.x);
  expect(Math.abs(familiarPortrait!.y - familiarName!.y)).toBeLessThanOrEqual(2);
  expect(familiarPortrait!.y + familiarPortrait!.height).toBeGreaterThanOrEqual(
    familiarTrickRules!.y + familiarTrickRules!.height - 2,
  );
  const experienceRows = await page.locator(".experience-list > div").evaluateAll((rows) => rows.map((row) => {
    const rect = row.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width };
  }));
  expect(experienceRows).toHaveLength(5);
  expect(experienceRows.every((row) => Math.abs(row.x - experienceRows[0].x) <= 1)).toBe(true);
  expect(experienceRows.every((row, index) => index === 0 || row.y > experienceRows[index - 1].y)).toBe(true);
  const contentGrid = await page.locator(".sheet-content-grid").boundingBox();
  const inventoryPanel = await page.locator(".inventory-panel").boundingBox();
  const terminalPanel = await page.locator('[data-module-slot-id="terminal-condition"]').boundingBox();
  const archetypePanel = await page.locator(".archetype-panel").boundingBox();
  const experiencePanel = await page.locator(".experience-panel").boundingBox();
  const leftColumn = await page.locator(".sheet-column").first().boundingBox();
  const omenPanel = await page.locator(".omen-panel").boundingBox();
  expect(contentGrid).not.toBeNull();
  expect(inventoryPanel).not.toBeNull();
  expect(terminalPanel).not.toBeNull();
  expect(archetypePanel).not.toBeNull();
  expect(experiencePanel).not.toBeNull();
  expect(leftColumn).not.toBeNull();
  expect(omenPanel).not.toBeNull();
  const omenInput = await page.locator('[data-module-id="omen-past"] textarea[data-part="input"]').boundingBox();
  expect(omenInput).not.toBeNull();
  expect(Math.abs(inventoryPanel!.x - leftColumn!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(inventoryPanel!.width - leftColumn!.width)).toBeLessThanOrEqual(1);
  expect(archetypePanel!.y).toBeGreaterThanOrEqual(portraitBox!.y + portraitBox!.height);
  expect(experiencePanel!.y).toBeGreaterThanOrEqual(archetypePanel!.y + archetypePanel!.height);
  expect(inventoryPanel!.y).toBeGreaterThanOrEqual(experiencePanel!.y + experiencePanel!.height);
  expect(Math.abs(omenPanel!.x - contentGrid!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(omenPanel!.width - contentGrid!.width)).toBeLessThanOrEqual(1);
  expect(omenPanel!.y).toBeGreaterThanOrEqual(contentGrid!.y + contentGrid!.height);
  expect(omenInput!.height).toBeGreaterThanOrEqual(120);
  await page.getByLabel("姓名", { exact: true }).fill("露娜");
  await editDefaultedFreeText(page, "essence-assiah", "物质界 Assiah", "+2");
  await editDefaultedFreeText(page, "essence-yetzirah", "精神界 Yetzirah", "0");
  await editDefaultedFreeText(page, "essence-atziluth", "灵界 Atziluth", "-2");
  await page.getByPlaceholder("经历 1").fill("森林贤者");
  await page.getByPlaceholder("经历 2").fill("魔药大师");
  await page.getByRole("textbox", { name: "终末条件", exact: true }).fill("被流动的水完全淹没");
  await page.getByRole("textbox", { name: "过去的预兆", exact: true }).fill("旧钟逆行");
  await page.getByRole("textbox", { name: "现在的预兆", exact: true }).fill("黑猫凝视月亮");
  await page.getByRole("textbox", { name: "未来的预兆", exact: true }).fill("银杯破裂");

  await page.getByRole("button", { name: "选择原型" }).click();
  await page.getByLabel("选择 园丁").click();
  await expect(page.locator('[data-module-id="archetype-name"]')).toContainText("园丁");
  await expect(page.locator('[data-module-id="archetype-description"]')).toContainText("精心培育");

  await page.getByRole("textbox", { name: "魔法一", exact: true }).fill("荆棘");
  await page.getByRole("textbox", { name: "魔法二", exact: true }).fill("月光");
  await page.getByRole("textbox", { name: "魔法三", exact: true }).fill("雨杯");
  await page.getByLabel("名字", { exact: true }).fill("墨团");
  await page.getByRole("button", { name: "选择使魔类型" }).click();
  await page.getByLabel("选择 警铃").click();
  await expect(page.locator('[data-module-id="familiar-type-name"]')).toContainText("警铃");
  await expect(page.locator('[data-module-id="familiar-type-description"]')).toContainText("每场景一次");
  await page.locator('[data-module-id="inventory"] textarea[data-part="input"]').fill("银杯、雨水瓶、旧钟发条");
  await page.waitForTimeout(350);

  await page.reload();
  await expect(page.getByText("ω1.0 女巫人物卡")).toBeVisible();
  await expect(page.locator('[data-module-id="archetype-name"]')).toContainText("园丁");
  await expect(page.locator('[data-module-id="familiar-type-name"]')).toContainText("警铃");
  await expect(page.locator('[data-module-id="inventory"]')).toContainText("银杯");
  await expect(page.locator('[data-module-id="omen-future"]')).toContainText("银杯破裂");
  await expect(page.getByRole("img", { name: "魔力：当前值 5，上限 5" })).toBeVisible();
  await page.getByRole("button", { name: "蚀痕增加" }).click();
  await page.getByRole("button", { name: "蚀痕增加" }).click();
  await expect(page.getByRole("img", { name: "魔力：当前值 3，上限 3" })).toBeVisible();
  await page.waitForTimeout(350);
  await page.reload();
  await expect(page.getByRole("img", { name: "魔力：当前值 3，上限 3" })).toBeVisible();

  const screenPlacement = await page.locator(".sheet-page").evaluate((item) => {
    const rect = item.getBoundingClientRect();
    const parentRect = item.parentElement!.getBoundingClientRect();
    return {
      ratio: rect.width / rect.height,
      centered: Math.abs((rect.left + rect.right) / 2 - (parentRect.left + parentRect.right) / 2) <= 2,
    };
  });
  expect(screenPlacement.ratio).toBeCloseTo(210 / 297, 2);
  expect(screenPlacement.centered).toBe(true);

  await openExportMenu(page);
  const printButton = page.locator('button[aria-label="打开浏览器打印 PDF"]');
  await expect(printButton).toHaveCount(1);
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => {
    window.print = () => {
      const pages = [...document.querySelectorAll<HTMLElement>('.sheet-page, [data-print-page="true"]')];
      document.documentElement.dataset.witchyPrintProbe = JSON.stringify(pages.map((item) => {
        const rect = item.getBoundingClientRect();
        const summary = item.querySelector<HTMLElement>(".character-summary")!.getBoundingClientRect();
        const portrait = item.querySelector<HTMLElement>('[data-module-slot-id="character-portrait"]')!.getBoundingClientRect();
        return {
          widthFits: item.scrollWidth <= item.clientWidth + 1,
          heightFits: item.scrollHeight <= item.clientHeight + 1,
          clientHeight: item.clientHeight,
          scrollHeight: item.scrollHeight,
          portraitShare: portrait.width / summary.width,
          ratio: rect.width / rect.height,
        };
      }));
    };
  });
  await printButton.evaluate((button) => (button as HTMLButtonElement).click());
  await expect.poll(() => page.evaluate(() => Boolean(
    document.documentElement.dataset.witchyPrintProbe
      || document.querySelector('button[aria-label="继续输出"]'),
  ))).toBe(true);
  const continueButton = page.locator('button[aria-label="继续输出"]');
  if (await continueButton.count()) {
    await continueButton.evaluate((button) => (button as HTMLButtonElement).click());
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.witchyPrintProbe)).not.toBeUndefined();
  const printProbe = JSON.parse(await page.evaluate(() => document.documentElement.dataset.witchyPrintProbe!));
  expect(printProbe).toHaveLength(1);
  expect(printProbe[0].widthFits && printProbe[0].heightFits, JSON.stringify(printProbe)).toBe(true);
  expect(printProbe[0].ratio).toBeCloseTo(210 / 297, 2);
  expect(Math.abs(printProbe[0].portraitShare - screenPortraitShare)).toBeLessThanOrEqual(0.03);
});

test("Witchy editable regions remain reachable on a narrow viewport", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await uploadPackage(page, await createWitchyPackage(testInfo));

  await expect(page.getByLabel("姓名", { exact: true })).toBeVisible();
  await expect(page.getByLabel("物质界 Assiah")).toBeVisible();
  await expect(page.getByText("蚀痕", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "选择原型" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "魔法一", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "魔法三", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "过去的预兆", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "选择使魔类型" })).toBeVisible();
  await expect(page.locator('[data-module-id="inventory"] textarea[data-part="input"]')).toBeVisible();
});

async function uploadPackage(page: Page, packagePath: string) {
  await page.getByRole("button", { name: "系统包", exact: true }).click();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /System Package zip/ }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(packagePath);
}

async function openExportMenu(page: Page) { await page.getByRole("button", { name: "导入导出", exact: true }).click(); }

async function editDefaultedFreeText(page: Page, moduleId: string, label: string, value: string) {
  const module = page.locator(`[data-module-id="${moduleId}"]`);
  await module.getByRole("button", { name: label, exact: true }).click();
  await module.getByRole("textbox", { name: label, exact: true }).fill(value);
}

async function expectPickerAfterField(page: Page, fieldId: string, pickerId: string) {
  const field = await page.locator(`[data-module-id="${fieldId}"]`).boundingBox();
  const picker = await page.locator(`[data-module-slot-id="${pickerId}"]`).boundingBox();
  const pickerContainer = await page.locator(`[data-module-id="${pickerId}"]`).boundingBox();
  const button = await page.locator(`[data-module-id="${pickerId}"] [data-part="button"]`).boundingBox();
  expect(field).not.toBeNull();
  expect(picker).not.toBeNull();
  expect(pickerContainer).not.toBeNull();
  expect(button).not.toBeNull();
  expect(picker!.x).toBeGreaterThanOrEqual(field!.x + field!.width);
  expect(Math.abs(picker!.y - field!.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(button!.y - field!.y)).toBeLessThanOrEqual(1);
  expect(
    Math.abs(button!.y + button!.height - (field!.y + field!.height)),
    JSON.stringify({ field, picker, pickerContainer, button }),
  ).toBeLessThanOrEqual(1);
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
