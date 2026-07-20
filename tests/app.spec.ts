import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { strToU8, zipSync } from "fflate";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

test("production preview serves the versioned app below /pbdh/", async ({ page }) => {
  await page.goto("/pbdh/");

  const { version } = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8")) as { version: string };
  await expect(page.locator('meta[name="pbdh-version"]')).toHaveAttribute("content", version);
  await expect(page.getByRole("heading", { name: "Sheet Tool" })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/pbdh/");

  const entrySources = await page.locator('script[type="module"][src], link[rel="stylesheet"][href]').evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("src") ?? element.getAttribute("href")),
  );
  expect(entrySources.length).toBeGreaterThan(0);
  expect(entrySources.every((source) => source?.startsWith("/pbdh/assets/"))).toBe(true);
});

test("switches between built-in System Packages without upload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "系统包", exact: true }).click();
  const presets = page.getByRole("combobox", { name: "预制系统包" });
  const presetDirectories = (await readdir(path.join(process.cwd(), "public", "system-packages"), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory());
  await expect(presets.locator("option")).toHaveCount(presetDirectories.length);
  await expect(presets).toHaveValue("daggerheart-core");
  await expect(page.locator('[data-system-package-id="daggerheart-core"]')).toBeVisible();

  await presets.selectOption("hows-my-driving");
  await expect(page.locator('[data-system-package-id="hows-my-driving"]')).toBeVisible();

  await page.getByRole("button", { name: "系统包", exact: true }).click();
  await presets.selectOption("heart-of-hopefind");
  await expect(page.locator('[data-system-package-id="heart-of-hopefind"]')).toBeVisible();
});

test("minimal loop edits, autosaves, exports and imports Character JSON", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByText("未加载")).toBeVisible();
  await expect(page.getByLabel("Sheet Tool", { exact: true })).not.toBeVisible();

  await uploadPackage(page, await demoPackagePath(testInfo));

  const nameInput = page.getByLabel("姓名");
  await expect(nameInput).toBeVisible();
  await nameInput.fill("阿青");
  await waitForAutosave(page);

  const htmlDownload = await downloadHtmlSnapshot(page);
  const htmlExportPath = path.join(testInfo.outputDir, "character.html");
  await htmlDownload.saveAs(htmlExportPath);
  const htmlExport = await readFile(htmlExportPath, "utf8");
  expect(htmlExport).toContain('class="sheet-tool"');
  expect(htmlExport).toContain("<p>阿青</p>");
  expect(htmlExport).toContain("break-inside: avoid");

  await page.reload();
  await expect(page.getByText("最小示例系统包")).toBeVisible();
  await expect(page.locator('[data-module-id="character-name"]')).toContainText("阿青");

  const download = await downloadCharacterJson(page);
  const exportPath = path.join(testInfo.outputDir, "character.json");
  await download.saveAs(exportPath);

  await page.locator('[data-module-id="character-name"] [role="button"]').click();
  await page.getByLabel("姓名").fill("改坏的名字");
  await waitForAutosave(page);

  const fileChooserPromise = page.waitForEvent("filechooser");
  await openExportMenu(page);
  await page.getByRole("button", { name: "导入 Character JSON" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(exportPath);

  await expect(page.locator('[data-module-id="character-name"]')).toContainText("阿青");
  await expect(page.getByText("Character Data 已导入为 Character Save。")).toBeVisible();
});

test("malformed import shows an error and keeps current Character Data", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await demoPackagePath(testInfo));
  await page.getByLabel("姓名").fill("阿青");
  await waitForAutosave(page);

  const badJsonPath = path.join(testInfo.outputDir, "bad.json");
  await mkdir(testInfo.outputDir, { recursive: true });
  await writeFile(badJsonPath, "{", "utf8");

  const fileChooserPromise = page.waitForEvent("filechooser");
  await openExportMenu(page);
  await page.getByRole("button", { name: "导入 Character JSON" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(badJsonPath);

  await expect(page.getByRole("alert")).toContainText("JSON 格式错误");
  await expect(page.locator('[data-module-id="character-name"]')).toContainText("阿青");
});

test("uploads a minimal System Package zip and keeps the Character JSON loop", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await demoPackagePath(testInfo));

  await expect(page.getByText("最小示例系统包")).toBeVisible();
  await page.getByLabel("姓名").fill("Zip阿青");
  await waitForAutosave(page);

  const download = await downloadCharacterJson(page);
  const exportPath = path.join(testInfo.outputDir, "zip-character.json");
  await download.saveAs(exportPath);

  await page.locator('[data-module-id="character-name"] [role="button"]').click();
  await page.getByLabel("姓名").fill("临时名字");
  await waitForAutosave(page);

  const characterChooserPromise = page.waitForEvent("filechooser");
  await openExportMenu(page);
  await page.getByRole("button", { name: "导入 Character JSON" }).click();
  const characterChooser = await characterChooserPromise;
  await characterChooser.setFiles(exportPath);
  await expect(page.locator('[data-module-id="character-name"]')).toContainText("Zip阿青");
  await page.waitForTimeout(400);

  await page.reload();
  await expect(page.getByText("最小示例系统包")).toBeVisible();
  await expect(page.locator('[data-module-id="character-name"]')).toContainText("Zip阿青");
});

test("uploads the complete demo package and persists module variants", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await completeDemoPackagePath(testInfo));

  await expect(page.getByRole("heading", { name: "System Package 完整演示" })).toBeVisible();
  await page.getByRole("button", { name: "Free Text", exact: true }).click();
  await page.getByLabel("普通单行文本").fill("陆青");
  await page.getByRole("button", { name: "Long Text", exact: true }).click();
  await page.getByLabel("默认四行").fill("第一行\n第二行");
  await page.getByRole("button", { name: "Checkbox Resource", exact: true }).click();
  await page.getByLabel("默认未选").check();
  await page.getByRole("button", { name: "Countable Resource", exact: true }).click();
  await page.getByRole("button", { name: "有限数值增加" }).click();
  await page.getByRole("button", { name: "有限数值增加" }).click();
  await expect(page.getByRole("textbox", { name: "有限数值", exact: true })).toHaveValue("5");
  await page.getByRole("button", { name: "Image Field", exact: true }).click();
  await expect(page.getByRole("button", { name: "上传Player 图片" })).toContainText("点击上传图片");

  const avatarPath = path.join(testInfo.outputDir, "avatar.png");
  await mkdir(testInfo.outputDir, { recursive: true });
  await writeFile(avatarPath, Buffer.from(tinyPngBase64, "base64"));
  const imageChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "上传Player 图片" }).click();
  const imageChooser = await imageChooserPromise;
  await imageChooser.setFiles(avatarPath);
  await expect(page.getByAltText("Player 上传的角色头像")).toBeVisible();
  await waitForAutosave(page);

  await page.reload();
  await page.getByRole("button", { name: "Free Text", exact: true }).click();
  await expect(page.locator('[data-module-id="free-basic"]')).toContainText("陆青");
  await page.getByRole("button", { name: "Long Text", exact: true }).click();
  await expect(page.locator('[data-module-id="long-basic"]')).toContainText("第一行");
  await page.getByRole("button", { name: "Checkbox Resource", exact: true }).click();
  await expect(page.getByLabel("默认未选")).toBeChecked();
  await page.getByRole("button", { name: "Countable Resource", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "有限数值", exact: true })).toHaveValue("5");
  await page.getByRole("button", { name: "Image Field", exact: true }).click();
  await expect(page.getByAltText("Player 上传的角色头像")).toBeVisible();

  const download = await downloadCharacterJson(page);
  const exportPath = path.join(testInfo.outputDir, "module-character.json");
  await download.saveAs(exportPath);

  const exported = JSON.parse(await readFile(exportPath, "utf8"));
  expect(exported.character.values["free-basic"]).toBe("陆青");
  expect(exported.character.values["long-basic"]).toBe("第一行\n第二行");
  expect(exported.character.values["checkbox-basic"]).toMatchObject({ unchecked: true, checked: true });
  expect(exported.character.values["count-numeric-bounded"]).toEqual({ current: 5, max: 6 });
  expect(exported.character.values["display-text"]).toBeUndefined();
  expect(exported.character.values.portrait).toMatchObject({ kind: "player-image" });
  expect(exported.playerImages[exported.character.values.portrait.imageId].dataUrl).toMatch(/^data:image\/png;base64,/);

  await page.getByRole("button", { name: "Free Text", exact: true }).click();
  await page.locator('[data-module-id="free-basic"] [role="button"]').click();
  await page.getByLabel("普通单行文本").fill("改坏");
  const characterChooserPromise = page.waitForEvent("filechooser");
  await openExportMenu(page);
  await page.getByRole("button", { name: "导入 Character JSON" }).click();
  const characterChooser = await characterChooserPromise;
  await characterChooser.setFiles(exportPath);

  await expect(page.locator('[data-module-id="free-basic"]')).toContainText("陆青");
});

test("uploads Resource Picker demo and restores filled text through export/import", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByText("未加载")).toBeVisible();
  await uploadPackage(page, await completeDemoPackagePath(testInfo));

  await page.getByRole("button", { name: "Resource Picker", exact: true }).click();
  const classPicker = page.locator('[data-module-id="pick-class"]');
  await classPicker.getByRole("button", { name: "单库：选择职业" }).click();
  const classDialog = page.getByRole("dialog", { name: "演示角色原型资源库" });
  await expect(classDialog).toBeVisible();
  await page.getByLabel("选择 守灯人").click();
  await page.getByRole("button", { name: "集成流程", exact: true }).click();
  await expect(page.locator('[data-module-id="class-name"]')).toContainText("守灯人");
  await expect(page.locator('[data-module-id="class-domains"]')).toContainText("星辉+守护");
  await expect(page.getByText(/谁把第一盏灯交给了你/)).toBeVisible();
  await expect(page.locator('[data-module-id="lantern-note"]')).toBeVisible();

  await page.getByRole("button", { name: "Resource Picker", exact: true }).click();
  await page.locator('[data-module-id="pick-subclass"]').getByRole("button", { name: "单库：选择子职" }).click();
  const subclassDialog = page.getByRole("dialog", { name: "演示专长资源库" });
  await expect(subclassDialog).toBeVisible();
  await expect(page.getByLabel("选择 晨光记录员")).toBeVisible();
  await expect(page.getByLabel("选择 苔痕向导")).not.toBeVisible();
  await subclassDialog.getByRole("button", { name: "筛选主职" }).click();
  await subclassDialog.getByRole("checkbox", { name: "守灯人" }).uncheck();
  await expect(page.getByLabel("选择 苔痕向导")).toBeVisible();
  await page.getByRole("button", { name: "关闭资源库" }).click();

  const single = page.locator('[data-module-id="pick-card-single"]');
  await single.getByRole("button", { name: "单选演示卡并创建卡牌" }).click();
  await expect(page.getByRole("dialog", { name: "演示卡牌资源库" })).toBeVisible();
  await expect(page.getByLabel("选择 星光地图")).not.toBeVisible();
  await page.getByLabel("选择 迅捷火花").click();
  await page.getByRole("button", { name: "Card Table", exact: true }).click();
  await expect(page.locator('[data-module-id="demo-card-table"]')).toBeVisible();
  await expect(page.getByAltText("迅捷火花")).toBeVisible();
  await page.locator(".play-card", { has: page.getByAltText("迅捷火花") }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "标记为宝库" }).click();
  await waitForAutosave(page);

  await page.reload();
  await page.getByRole("button", { name: "集成流程", exact: true }).click();
  await expect(page.locator('[data-module-id="class-name"]')).toContainText("守灯人");
  await expect(page.locator('[data-module-id="selected-card-name"]')).toContainText("迅捷火花");

  const download = await downloadCharacterJson(page);
  const exportPath = path.join(testInfo.outputDir, "selection-character.json");
  await download.saveAs(exportPath);

  const exportedText = await readFile(exportPath, "utf8");
  const exported = JSON.parse(exportedText);
  expect(exported.character.values["class-name"]).toBe("守灯人");
  expect(exported.character.values["class-domains"]).toBe("星辉+守护");
  expect(exported.character.values["selected-card-name"]).toBe("迅捷火花");
  expect(exported.cards.instances).toEqual([
    expect.objectContaining({
      tableModuleId: "demo-card-table",
      definitionRef: {
        type: "resourceLibrary",
        libraryId: "demo-cards",
        entryId: "demo-card:迅捷火花",
      },
      state: "宝库",
    }),
  ]);
  expect(exported.character.values["class-background-questions"]).toBeUndefined();
  expect(exported.character.values["lantern-note"]).toBeUndefined();
  expect(exported.character.values["pick-class"]).toBeUndefined();
  expect(exported.character.values["pick-subclass"]).toBeUndefined();
  expect(exported.character.values["pick-card-single"]).toBeUndefined();
  expect(exportedText).not.toContain("resource-selection");
  expect(exportedText).not.toContain("assets/flame-card.svg");
  expect(exportedText).not.toContain("data:image");
  expect(exportedText).not.toContain("<svg");

  const selectedCardModule = page.locator('[data-module-id="selected-card-name"]');
  await selectedCardModule.getByRole("button").click();
  const selectedCardName = selectedCardModule.getByRole("textbox", { name: "单选演示卡", exact: true });
  await selectedCardName.fill("临时演示卡");
  await expect(selectedCardName).toHaveValue("临时演示卡");

  const characterChooserPromise = page.waitForEvent("filechooser");
  await openExportMenu(page);
  await page.getByRole("button", { name: "导入 Character JSON" }).click();
  const characterChooser = await characterChooserPromise;
  await characterChooser.setFiles(exportPath);

  await expect(page.locator('[data-module-id="selected-card-name"]')).toContainText("迅捷火花");
});

test("complete demo teaches the A/B/C Validation exercise", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await completeDemoPackagePath(testInfo));
  await page.getByRole("button", { name: "Free Text", exact: true }).click();

  await expect(page.getByText("Validation 练习：C = A + B")).toBeVisible();
  await page.getByLabel("A", { exact: true }).fill("2");
  await page.getByLabel("B", { exact: true }).fill("3");
  await page.getByLabel("C = A + B", { exact: true }).fill("4");
  await openPlayerMenu(page);
  await page.getByRole("button", { name: "运行 Validation Checks" }).click();
  const report = page.getByRole("dialog", { name: "Validation Report" });
  await expect(report).toContainText("DEMO_EQUATION_MISMATCH");
  await expect(report).toContainText("C 应为 5");
  await report.getByRole("button", { name: "关闭检查报告" }).click();

  await page.locator('[data-module-id="validation-c"] [role="button"]').click();
  await page.getByLabel("C = A + B", { exact: true }).fill("5");
  await openPlayerMenu(page);
  await page.getByRole("button", { name: "运行 Validation Checks" }).click();
  await expect(page.getByRole("dialog", { name: "Validation Report" })).toContainText("DEMO_EQUATION_VALID");
});

test("Character Creation Guide spotlights interactive targets without taking over their behavior", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByText("未加载")).toBeVisible();
  await uploadPackage(page, await completeDemoPackagePath(testInfo));

  await openPlayerMenu(page);
  await page.getByRole("button", { name: "启动车卡指引" }).click();
  const guide = page.getByRole("dialog", { name: "车卡指引" });
  await expect(guide).toContainText("Guide 是什么");
  await expect(guide).toContainText("1 / 13");

  await page.getByRole("button", { name: "下一步" }).click();
  await expect(guide).toContainText("高亮 Layout Region");
  await expect(guide).toContainText("2 / 13");
  const ring = page.locator(".guide-target-ring");
  await expect(ring).toBeVisible();
  await expect.poll(() => page.locator(".top-bar").evaluate((element) => (element as HTMLElement).inert)).toBe(true);

  for (let step = 2; step < 9; step += 1) await page.getByRole("button", { name: "下一步" }).click();
  await expect(guide).toContainText("Resource Picker");
  const classTarget = page.locator('[data-module-slot-id="pick-class"]');
  await classTarget.getByRole("button", { name: "单库：选择职业" }).click();
  const resourceDialog = page.getByRole("dialog", { name: "职业资源库" });
  await expect(resourceDialog).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        guide: Number.parseInt(getComputedStyle(document.querySelector(".guide-spotlight-root")!).zIndex, 10),
        resource: Number.parseInt(getComputedStyle(document.querySelector(".resource-dialog-backdrop")!).zIndex, 10),
      })),
    )
    .toMatchObject({ guide: 50, resource: 80 });
  await page.getByLabel("选择 德鲁伊").click();
  await expect(resourceDialog).not.toBeVisible();
  await expect(guide).toContainText("9 / 13");
  await page.keyboard.press("Escape");
  await expect(guide).not.toBeVisible();

  await page.reload();
  await openPlayerMenu(page);
  await page.getByRole("button", { name: "启动车卡指引" }).click();
  const restartedGuide = page.getByRole("dialog", { name: "车卡指引" });
  await expect(restartedGuide).toContainText("1 / 13");
  await page.keyboard.press("Escape");
  await expect(restartedGuide).not.toBeVisible();
  await expect(page.getByRole("button", { name: "启动车卡指引" })).toBeFocused();
});

test("Character Creation Guide uses a bottom panel on a mobile viewport", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto("/");
  await expect(page.getByText("未加载")).toBeVisible();
  await uploadPackage(page, await createDaggerheartCorePackage(testInfo));
  await openPlayerMenu(page);
  await page.getByRole("button", { name: "启动车卡指引" }).click();

  const panel = page.locator(".guide-panel-mobile");
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(480);
  expect(box!.y + box!.height).toBeLessThanOrEqual(900);
  expect(box!.y + box!.height).toBeGreaterThan(850);

  await page.setViewportSize({ width: 900, height: 700 });
  await expect(page.locator(".guide-panel-mobile")).toHaveCount(0);
  await expect(page.locator(".guide-panel-default")).toBeVisible();
});

test("Daggerheart Guide renders long Restricted Markdown and follows cross-page targets", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await createDaggerheartCorePackage(testInfo));

  await openPlayerMenu(page);
  await page.getByRole("button", { name: "启动车卡指引" }).click();
  const guide = page.getByRole("dialog", { name: "车卡指引" });
  const actions = page.getByRole("toolbar", { name: "车卡指引操作" });
  await expect(guide).toContainText("车卡器功能介绍");
  await expect(guide).toContainText("1 / 18");
  await expect(actions).toBeVisible();
  await expect.poll(() => actions.evaluate((element) => getComputedStyle(element).position)).toBe("fixed");

  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByRole("button", { name: "下一步" }).click();
  await expect(guide).toContainText("职业");
  await expect(page.locator('[data-guide-region-id="guide-class"]')).toBeVisible();

  await page.getByRole("button", { name: "下一步" }).click();
  const baseFeature = guide.getByText("基础", { exact: true });
  await expect(baseFeature).toHaveJSProperty("tagName", "STRONG");
  await expect(baseFeature.locator("xpath=ancestor::span[1]")).toHaveAttribute("data-markdown-color", "red");

  for (let step = 4; step < 15; step += 1) {
    await page.getByRole("button", { name: "下一步" }).click();
  }
  await expect(guide).toContainText("背景与问题");
  await expect(guide).toContainText("15 / 18");
  await expect(page.locator('[data-guide-region-id="guide-background-questions"]')).toBeVisible();
  await expect(page.locator('[data-template-page-id="character-story"]')).toBeVisible();
  const panelBox = await guide.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(panelBox!.width).toBeLessThanOrEqual(721);

  await page.getByRole("button", { name: "退出车卡指引" }).click();
  await expect(page.locator('[data-template-page-id="character-story"]')).toBeVisible();
});

test("HTML Layout Template keeps Countable variants readable and stacks dense grids on small screens", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await completeDemoPackagePath(testInfo));

  await page.getByRole("button", { name: "Countable Resource", exact: true }).click();
  const countableGrid = page.locator(".demo-grid.single");
  await expect(countableGrid).toBeVisible();
  await expect.poll(() => countableGrid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length)).toBe(1);
  await expect(page.getByRole("textbox", { name: "可改上限数值上限", exact: true })).toHaveValue("5");
  await page.getByRole("textbox", { name: "可改上限数值上限", exact: true }).fill("3");
  await expect(page.getByRole("textbox", { name: "可改上限数值上限", exact: true })).toHaveValue("3");
  await expect(page.getByText("本例步长为 2")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "无上限数值（步长 2）", exact: true })).toHaveValue("2");
  await page.getByRole("button", { name: "无上限数值（步长 2）增加" }).click();
  await expect(page.getByRole("textbox", { name: "无上限数值（步长 2）", exact: true })).toHaveValue("4");

  await page.getByRole("button", { name: "Read Only Display", exact: true }).click();
  const readOnlyImageModule = page.locator('[data-module-id="display-image"]');
  await expect(page.getByAltText("Demo 徽记")).toBeVisible();
  expect(await readOnlyImageModule.evaluate((element) => {
    const moduleRect = element.getBoundingClientRect();
    const image = element.querySelector<HTMLElement>('[data-part="image"]')!;
    const imageRect = image.getBoundingClientRect();
    return getComputedStyle(image).position === "static"
      && imageRect.left >= moduleRect.left - 1
      && imageRect.right <= moduleRect.right + 1
      && imageRect.top >= moduleRect.top - 1
      && imageRect.bottom <= moduleRect.bottom + 1;
  })).toBe(true);

  await page.getByRole("button", { name: "Resource Picker", exact: true }).click();
  const variantGrid = page.locator(".demo-grid.three");
  await expect(variantGrid).toBeVisible();
  await expect.poll(() => variantGrid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length)).toBe(3);
  await page.setViewportSize({ width: 480, height: 900 });
  await expect
    .poll(() => variantGrid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length))
    .toBe(1);
});

test("complete demo uses the same A4 page box on screen and in print", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await completeDemoPackagePath(testInfo));

  for (const pageName of [
    "演示首页",
    "Free Text",
    "Long Text",
    "Checkbox Resource",
    "Countable Resource",
    "Read Only Display",
    "Image Field",
    "Resource Picker",
    "Resource Composer",
    "Card Table",
    "集成流程",
  ]) {
    await page.getByRole("button", { name: pageName, exact: true }).click();
    const pageBox = page.locator(".sheet-page");
    await expect(pageBox).toBeVisible();
    const screen = await pageBoxMetrics(pageBox);
    expect(screen.width).toBeCloseTo(210 * 96 / 25.4, 0);
    expect(screen.height).toBeCloseTo(297 * 96 / 25.4, 0);
    expect(screen.scrollWidth).toBeLessThanOrEqual(screen.clientWidth + 1);
    expect(screen.scrollHeight).toBeLessThanOrEqual(screen.clientHeight + 1);
  }

  const pageBox = page.locator(".sheet-page");
  const screen = await pageBoxMetrics(pageBox);
  await page.emulateMedia({ media: "print" });
  const print = await pageBoxMetrics(pageBox);
  expect(print.width).toBeCloseTo(screen.width, 0);
  expect(print.height).toBeCloseTo(screen.height, 0);
  expect(print.padding).toBe(screen.padding);
});

test("Daggerheart story editors fill their outer frames", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await createDaggerheartCorePackage(testInfo));
  await page.getByRole("button", { name: "背景与关系", exact: true }).click();

  for (const moduleId of ["event-log", "background-story"]) {
    const module = page.locator(`[data-module-id="${moduleId}"]`);
    const textarea = module.locator("textarea");
    await expect(textarea).toBeVisible();

    const gaps = await module.evaluate((element) => {
      const container = element.getBoundingClientRect();
      const input = element.querySelector("textarea")!.getBoundingClientRect();
      return {
        left: input.left - container.left,
        right: container.right - input.right,
        bottom: container.bottom - input.bottom,
      };
    });

    expect(Math.abs(gaps.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(gaps.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(gaps.bottom)).toBeLessThanOrEqual(1);
  }
});

test("Astral Cartographer Skin keeps every printable surface inside its A4 page box", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await createDaggerheartCorePackage(testInfo));
  await selectDaggerheartSkin(page, "skin-gpt-5.6sol");

  await expect(page.locator(".astral-workspace")).toBeVisible();
  await expect(page.locator(".astral-main-page")).toBeVisible();
  await expect(page.locator('[data-guide-region-id="guide-class"]')).toBeVisible();
  await page.locator('[data-module-id="class-name"] input').fill("游侠");
  await page.locator('[data-module-id="ancestry-name"] input').fill("械灵 / 树精");
  await page.locator('[data-module-id="community-name"] input').fill("博识之士");
  const identityGeometry = await page.locator(".astral-identity-fields").evaluate((element) => {
    const rect = (selector: string) => {
      const box = element.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
      return { top: box.top, right: box.right, bottom: box.bottom, left: box.left, width: box.width };
    };
    return {
      classField: rect(".class-field"),
      ancestryField: rect(".ancestry-field"),
      communityField: rect(".community-field"),
    };
  });
  expect(identityGeometry.classField.bottom).toBeLessThanOrEqual(identityGeometry.ancestryField.top + 1);
  expect(Math.abs(identityGeometry.ancestryField.top - identityGeometry.communityField.top)).toBeLessThanOrEqual(1);
  expect(identityGeometry.ancestryField.right).toBeLessThanOrEqual(identityGeometry.communityField.left + 1);
  expect(identityGeometry.ancestryField.width).toBeGreaterThanOrEqual(180);
  expect(identityGeometry.communityField.width).toBeGreaterThanOrEqual(180);
  const defenceGeometry = await page.locator(".astral-defense-dials").evaluate((element) => {
    const rect = (moduleId: string) => {
      const box = element.querySelector<HTMLElement>(`[data-module-slot-id="${moduleId}"]`)!.getBoundingClientRect();
      return { top: box.top, right: box.right, bottom: box.bottom, left: box.left };
    };
    return [rect("evasion"), rect("armor-value"), rect("major-threshold"), rect("severe-threshold")];
  });
  expect(Math.abs(defenceGeometry[0].top - defenceGeometry[1].top)).toBeLessThanOrEqual(1);
  expect(Math.abs(defenceGeometry[2].top - defenceGeometry[3].top)).toBeLessThanOrEqual(1);
  expect(defenceGeometry[0].right).toBeLessThanOrEqual(defenceGeometry[1].left - 4);
  expect(defenceGeometry[0].bottom).toBeLessThanOrEqual(defenceGeometry[2].top - 4);
  expect(defenceGeometry[2].right).toBeLessThanOrEqual(defenceGeometry[3].left - 4);
  await page.locator(".astral-sheet-vessel").screenshot({ path: testInfo.outputPath("astral-main-screen.png") });
  await page.getByRole("button", { name: "背景与关系", exact: true }).click();
  await expect(page.locator(".astral-story-page")).toBeVisible();
  await page.locator(".astral-sheet-vessel").screenshot({ path: testInfo.outputPath("astral-story-screen.png") });
  await page.getByRole("button", { name: "人物卡", exact: true }).click();

  const classPicker = page.locator('[data-module-id="pick-class"]');
  await classPicker.getByRole("button").click();
  await page.getByLabel("选择 德鲁伊").click();
  await expect(page.getByRole("button", { name: "野兽形态 T1-T2", exact: true })).toBeVisible();

  await openExportMenu(page);
  const printButton = page.locator('button[aria-label="打开浏览器打印 PDF"]');
  await expect(printButton).toHaveCount(1);
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => {
    window.print = () => {
      const surfaces = [...document.querySelectorAll<HTMLElement>('.sheet-page, [data-print-page="true"]')];
      document.documentElement.dataset.astralA4Probe = JSON.stringify(surfaces.map((surface) => {
        const rect = surface.getBoundingClientRect();
        const descendants = [...surface.querySelectorAll<HTMLElement>("*")].filter((element) => getComputedStyle(element).position !== "fixed");
        const right = Math.max(rect.right, ...descendants.map((element) => element.getBoundingClientRect().right));
        const bottom = Math.max(rect.bottom, ...descendants.map((element) => element.getBoundingClientRect().bottom));
        return {
          pageId: surface.matches(".sheet-page")
            ? surface.dataset.templatePageId ?? surface.querySelector<HTMLElement>("[data-template-page-id]")?.dataset.templatePageId ?? "sheet-page"
            : "shell-card-page",
          width: rect.width,
          height: rect.height,
          horizontalOverflow: Math.max(surface.scrollWidth - surface.clientWidth, right - rect.right),
          verticalOverflow: Math.max(surface.scrollHeight - surface.clientHeight, bottom - rect.bottom),
        };
      }));
    };
  });

  await printButton.evaluate((button) => (button as HTMLButtonElement).click());
  await expect.poll(() => page.evaluate(() => Boolean(
    document.documentElement.dataset.astralA4Probe
      || document.querySelector('button[aria-label="继续输出"]'),
  ))).toBe(true);
  const hiddenContinueButton = page.locator('button[aria-label="继续输出"]');
  if (await hiddenContinueButton.count()) {
    await hiddenContinueButton.evaluate((button) => (button as HTMLButtonElement).click());
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.astralA4Probe)).not.toBeUndefined();
  const metrics = JSON.parse(await page.evaluate(() => document.documentElement.dataset.astralA4Probe!)) as Array<{
    pageId: string;
    width: number;
    height: number;
    horizontalOverflow: number;
    verticalOverflow: number;
  }>;

  expect(metrics.map((metric) => metric.pageId)).toEqual([
    "character-main",
    "character-story",
    "beast-forms-t1-t2",
    "beast-forms-t3-t4",
    "shell-card-page",
  ]);
  for (const metric of metrics) {
    expect(metric.width, metric.pageId).toBeCloseTo(210 / 25.4 * 96, 0);
    expect(metric.height, metric.pageId).toBeCloseTo(297 / 25.4 * 96, 0);
  }
  expect(metrics.filter((metric) => metric.horizontalOverflow > 1 || metric.verticalOverflow > 1)).toEqual([]);
});

test("Thread-bound KimiK3 Skin keeps every printable surface inside its A4 page box", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await createDaggerheartCorePackage(testInfo));
  await selectDaggerheartSkin(page, "skin-KimiK3");

  await expect(page.locator(".character-main-page.kimi-thread-book")).toBeVisible();
  await expect(page.locator(".book-fold-edge")).toBeVisible();
  await expect(page.locator(".brand-slip")).toBeVisible();
  await expect(page.locator(".card-table-banner")).toBeVisible();
  await expect(page.locator('[data-guide-region-id="guide-class"]')).toBeVisible();
  await page.locator(".daggerheart-sheet-pane").screenshot({ path: testInfo.outputPath("kimi-main-screen.png") });
  await page.getByRole("button", { name: "背景与关系", exact: true }).click();
  await expect(page.locator(".character-story-page.kimi-thread-book")).toBeVisible();
  await page.locator(".daggerheart-sheet-pane").screenshot({ path: testInfo.outputPath("kimi-story-screen.png") });
  await page.getByRole("button", { name: "人物卡", exact: true }).click();

  const classPicker = page.locator('[data-module-id="pick-class"]');
  await classPicker.getByRole("button").click();
  await page.getByLabel("选择 德鲁伊").click();
  await expect(page.getByRole("button", { name: "野兽形态 T1-T2", exact: true })).toBeVisible();

  await openExportMenu(page);
  const printButton = page.locator('button[aria-label="打开浏览器打印 PDF"]');
  await expect(printButton).toHaveCount(1);
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => {
    window.print = () => {
      const surfaces = [...document.querySelectorAll<HTMLElement>('.sheet-page, [data-print-page="true"]')];
      document.documentElement.dataset.kimiA4Probe = JSON.stringify(surfaces.map((surface) => {
        const rect = surface.getBoundingClientRect();
        const descendants = [...surface.querySelectorAll<HTMLElement>("*")].filter((element) => getComputedStyle(element).position !== "fixed");
        const right = Math.max(rect.right, ...descendants.map((element) => element.getBoundingClientRect().right));
        const bottom = Math.max(rect.bottom, ...descendants.map((element) => element.getBoundingClientRect().bottom));
        return {
          pageId: surface.matches(".sheet-page")
            ? surface.dataset.templatePageId ?? surface.querySelector<HTMLElement>("[data-template-page-id]")?.dataset.templatePageId ?? "sheet-page"
            : "shell-card-page",
          width: rect.width,
          height: rect.height,
          horizontalOverflow: Math.max(surface.scrollWidth - surface.clientWidth, right - rect.right),
          verticalOverflow: Math.max(surface.scrollHeight - surface.clientHeight, bottom - rect.bottom),
        };
      }));
    };
  });

  await printButton.evaluate((button) => (button as HTMLButtonElement).click());
  await expect.poll(() => page.evaluate(() => Boolean(
    document.documentElement.dataset.kimiA4Probe
      || document.querySelector('button[aria-label="继续输出"]'),
  ))).toBe(true);
  const hiddenContinueButton = page.locator('button[aria-label="继续输出"]');
  if (await hiddenContinueButton.count()) {
    await hiddenContinueButton.evaluate((button) => (button as HTMLButtonElement).click());
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.kimiA4Probe)).not.toBeUndefined();
  const metrics = JSON.parse(await page.evaluate(() => document.documentElement.dataset.kimiA4Probe!)) as Array<{
    pageId: string;
    width: number;
    height: number;
    horizontalOverflow: number;
    verticalOverflow: number;
  }>;

  expect(metrics.map((metric) => metric.pageId)).toEqual([
    "character-main",
    "character-story",
    "beast-forms-t1-t2",
    "beast-forms-t3-t4",
    "shell-card-page",
  ]);
  for (const metric of metrics) {
    expect(metric.width, metric.pageId).toBeCloseTo(210 / 25.4 * 96, 0);
    expect(metric.height, metric.pageId).toBeCloseTo(297 / 25.4 * 96, 0);
  }
  expect(metrics.filter((metric) => metric.horizontalOverflow > 1 || metric.verticalOverflow > 1)).toEqual([]);
});

test("Daggerheart beast-form references fit equal-height cards when printed", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await createDaggerheartCorePackage(testInfo));

  const classPicker = page.locator('[data-module-id="pick-class"]');
  await classPicker.getByRole("button").click();
  await page.getByLabel("选择 德鲁伊").click();

  const overflowingForms: Array<{ pageName: string; title: string; overflowPx: number }> = [];
  const bodyFontSizes: number[] = [];
  for (const pageName of ["野兽形态 T1-T2", "野兽形态 T3-T4"]) {
    await page.getByRole("button", { name: pageName, exact: true }).click();
    const referencePage = page.locator(".beast-reference-page");
    const screenGapPx = await page.locator(".beast-tier").first().evaluate((element) => Number.parseFloat(getComputedStyle(element).rowGap));
    expect(screenGapPx).toBeGreaterThanOrEqual(3);
    await page.emulateMedia({ media: "print" });
    const metrics = await page.locator(".beast-form").evaluateAll((forms) =>
      forms.map((form) => {
        const element = form as HTMLElement;
        const box = element.getBoundingClientRect();
        return {
          title: element.querySelector("h3")?.textContent ?? "",
          fontSizePx: Number.parseFloat(getComputedStyle(element).fontSize),
          heightPx: box.height,
          overflowPx: element.scrollHeight - element.clientHeight,
        };
      }),
    );
    const pageOverflows = await referencePage.evaluate((element) => element.scrollHeight > element.clientHeight + 1);
    const summariesStartOnSeparateLines = await referencePage.evaluate((element) =>
      [...element.querySelectorAll<HTMLElement>(".beast-form")].every((form) => {
        const summaries = [...form.querySelectorAll<HTMLElement>(".beast-summary")];
        return summaries.length < 2 || summaries[1].getBoundingClientRect().top > summaries[0].getBoundingClientRect().top + 1;
      }),
    );
    const emphasisColors = await referencePage.evaluate((element) => {
      const featureNames = [...element.querySelectorAll<HTMLElement>(
        ".beast-form .beast-feature-name",
      )];
      const inlineEmphasis = [...element.querySelectorAll<HTMLElement>(
        ".beast-form > p:not(.beast-summary) > strong:not(.beast-feature-name)",
      )];
      return {
        featureNames: featureNames.map((strong) => getComputedStyle(strong).color),
        inlineEmphasis: inlineEmphasis.map((strong) => getComputedStyle(strong).color),
      };
    });

    expect(metrics.every(({ fontSizePx }) => fontSizePx >= 11)).toBe(true);
    bodyFontSizes.push(...metrics.map(({ fontSizePx }) => fontSizePx));
    expect(new Set(metrics.map(({ heightPx }) => Math.round(heightPx))).size).toBe(1);
    overflowingForms.push(...metrics.filter(({ overflowPx }) => overflowPx > 1).map(({ title, overflowPx }) => ({ pageName, title, overflowPx })));
    expect(pageOverflows).toBe(false);
    expect(summariesStartOnSeparateLines).toBe(true);
    expect(emphasisColors.featureNames.length).toBeGreaterThan(0);
    expect(new Set(emphasisColors.featureNames)).toEqual(new Set(["rgb(138, 31, 31)"]));
    expect(emphasisColors.inlineEmphasis.length).toBeGreaterThan(0);
    expect(emphasisColors.inlineEmphasis).not.toContain("rgb(138, 31, 31)");
    await page.emulateMedia({ media: "screen" });
  }
  expect(new Set(bodyFontSizes)).toEqual(new Set([11]));
  expect(overflowingForms).toEqual([]);
});

test("Daggerheart Ranger companion stays within one A4 page when printed", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await createDaggerheartCorePackage(testInfo));
  await selectDaggerheartSkin(page, "skin-gpt-5.6sol");

  await expect(page.getByRole("button", { name: "游侠动物伙伴", exact: true })).toHaveCount(0);
  const subclassPicker = page.locator('[data-module-id="pick-subclass"]');
  await subclassPicker.getByRole("button").click();
  await page.getByLabel("选择 驯兽大师").first().click();
  await page.getByRole("button", { name: "游侠动物伙伴", exact: true }).click();

  await expect(page.locator('[data-module-id="companion-name"]')).toBeVisible();
  await expect(page.locator('[data-module-id="companion-evasion"]')).toContainText("10");
  await expect(page.locator('[data-module-id="companion-attack-die"]').getByRole("checkbox", { name: "d6", exact: true })).toBeChecked();
  await expect(page.locator('[data-module-id="companion-attack-range"]')).toContainText("近战");
  await expect(page.locator('[data-module-id="companion-stress"] [data-part="marker"]')).toHaveCount(3);

  await page.emulateMedia({ media: "print" });
  const companionPage = page.locator(".companion-page");
  const metrics = await companionPage.evaluate((element) => {
    const pageElement = element.closest<HTMLElement>(".sheet-page")!;
    const root = element as HTMLElement;
    return {
      pageWidth: pageElement.getBoundingClientRect().width,
      pageHeight: pageElement.getBoundingClientRect().height,
      horizontalOverflow: root.scrollWidth - root.clientWidth,
      verticalOverflow: root.scrollHeight - root.clientHeight,
    };
  });
  expect(metrics.pageWidth).toBeCloseTo(210 / 25.4 * 96, 0);
  expect(metrics.pageHeight).toBeCloseTo(297 / 25.4 * 96, 0);
  expect(metrics.horizontalOverflow).toBeLessThanOrEqual(1);
  expect(metrics.verticalOverflow).toBeLessThanOrEqual(1);

  await page.locator(".sheet-page").screenshot({ path: testInfo.outputPath("ranger-companion-print.png") });
});

test("Daggerheart story Long Text previews auto-fit without growing their frames", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await createDaggerheartCorePackage(testInfo));
  await page.getByRole("button", { name: "背景与关系", exact: true }).click();
  const longStory = Array.from({ length: 18 }, (_, index) => `第 ${index + 1} 条重要角色记录`).join("\n");

  for (const moduleId of ["event-log", "background-story"]) {
    const module = page.locator(`[data-module-id="${moduleId}"]`);
    const textarea = module.locator("textarea");
    await textarea.fill(longStory);
    await textarea.evaluate((element) => element.blur());

    const preview = module.locator('[data-markdown-preview="true"]');
    await expect(preview).toBeVisible();
    await expect.poll(() => preview.getAttribute("data-text-fit")).toBe("fitted");
    const metrics = await preview.evaluate((element) => {
      const htmlElement = element as HTMLElement;
      return {
        fontSizePx: Number.parseFloat(getComputedStyle(htmlElement).fontSize),
        clientHeight: htmlElement.clientHeight,
        scrollHeight: htmlElement.scrollHeight,
      };
    });
    expect(metrics.fontSizePx).toBeGreaterThanOrEqual(9);
    expect(metrics.fontSizePx).toBeLessThan(16);
    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
  }
});

test("Daggerheart Countable Resources print as fixed hollow-square slots", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await createDaggerheartCorePackage(testInfo));
  await page.evaluate(() => {
    window.print = () => {
      const tool = document.querySelector<HTMLElement>('[aria-label="Sheet Tool"]')!;
      const cells = [...tool.querySelectorAll<HTMLElement>('[data-module-type="countableResource"] .marker-cell')];
      document.documentElement.dataset.countablePrintProbe = JSON.stringify({
        strategy: tool.dataset.countablePrintStrategy,
        cells: cells.map((cell) => {
          const square = getComputedStyle(cell, "::before");
          const glyph = cell.querySelector<HTMLElement>(".marker-glyph")!;
          return {
            content: square.content.replaceAll('"', ""),
            fontSize: square.fontSize,
            flexBasis: square.flexBasis,
            glyphDisplay: getComputedStyle(glyph).display,
          };
        }),
      });
    };
  });

  await openExportMenu(page);
  await page.getByRole("button", { name: "打开浏览器打印 PDF" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.countablePrintProbe)).not.toBeUndefined();
  const probe = await page.evaluate(() => document.documentElement.dataset.countablePrintProbe!);
  const metrics = JSON.parse(probe) as {
    strategy: string;
    cells: Array<{ content: string; fontSize: string; flexBasis: string; glyphDisplay: string }>;
  };

  expect(metrics.strategy).toBe("clear-uniform-squares");
  expect(metrics.cells).toHaveLength(24);
  expect(new Set(metrics.cells.map((cell) => cell.content))).toEqual(new Set(["□"]));
  expect(new Set(metrics.cells.map((cell) => cell.fontSize)).size).toBe(1);
  expect(Number.parseFloat(metrics.cells[0].fontSize)).toBeGreaterThan(20);
  expect(new Set(metrics.cells.map((cell) => cell.flexBasis)).size).toBe(1);
  expect(new Set(metrics.cells.map((cell) => cell.glyphDisplay))).toEqual(new Set(["none"]));
});

test("text Card descriptions auto-fit rendered content with a 9px floor", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await createCardFitPackage(testInfo));

  const picker = page.getByRole("button", { name: "添加测试卡" });
  await picker.click();
  await page.getByLabel("选择 自动拟合卡").click();
  const fittedCard = page.getByRole("article", { name: "自动拟合卡" });
  const fittedDescription = fittedCard.locator(".play-card-description");
  await expect.poll(() => fittedDescription.getAttribute("data-card-description-fit")).toBe("fitted");
  const initialFit = await cardDescriptionMetrics(fittedDescription);
  expect(initialFit.fontSizePx).toBeGreaterThanOrEqual(9);
  expect(initialFit.fontSizePx).toBeLessThan(16);
  expect(initialFit.scrollHeight).toBeLessThanOrEqual(initialFit.clientHeight + 1);
  expect(await fittedCard.locator(".play-card-name").evaluate((element) => (element as HTMLElement).style.fontSize)).toBe("");
  expect(await fittedCard.locator(".play-card-tag").first().evaluate((element) => (element as HTMLElement).style.fontSize)).toBe("");

  const sizeControl = page.getByLabel("测试卡牌桌面卡牌大小");
  await sizeControl.fill("320");
  await expect.poll(async () => (await cardDescriptionMetrics(fittedDescription)).fontSizePx).toBeGreaterThanOrEqual(initialFit.fontSizePx);

  await picker.click();
  await page.getByLabel("选择 极端长文本卡").click();
  const overflowCard = page.getByRole("article", { name: "极端长文本卡" });
  const overflowDescription = overflowCard.locator(".play-card-description");
  await expect.poll(() => overflowDescription.getAttribute("data-card-description-fit")).toBe("overflow");
  expect((await cardDescriptionMetrics(overflowDescription)).fontSizePx).toBe(9);
  await expect(overflowCard.getByRole("img", { name: "卡牌描述未完全显示；查看卡牌详情可阅读完整内容" })).toBeVisible();

  await overflowCard.click({ button: "right" });
  await page.getByRole("menuitem", { name: "查看详情" }).click();
  const detail = page.getByRole("dialog", { name: "极端长文本卡详情" });
  await expect(detail.locator(".play-card-description")).not.toHaveAttribute("style", /font-size/);
  await expect(detail.getByText(/极端内容段落/).first()).toBeVisible();
  await detail.getByRole("button", { name: "关闭卡牌详情" }).click();

  const htmlDownload = await downloadHtmlSnapshot(page);
  const snapshotPath = path.join(testInfo.outputDir, "card-fit.html");
  await htmlDownload.saveAs(snapshotPath);
  const snapshot = await readFile(snapshotPath, "utf8");
  expect(snapshot).toContain("data-card-description-fit=");
  expect(snapshot).toContain("data-card-description-font-size=");
});

test("printed text Cards preserve their screen presentation", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await createCardFitPackage(testInfo));
  await page.getByRole("button", { name: "添加测试卡" }).click();
  await page.getByLabel("选择 自动拟合卡").click();
  const card = page.getByRole("article", { name: "自动拟合卡" });
  const description = card.locator(".play-card-description");
  await expect.poll(() => description.getAttribute("data-card-description-fit")).toBe("fitted");
  const screenPresentation = await cardPresentationMetrics(card);

  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect.poll(() => description.getAttribute("data-card-description-fit")).toBe("fitted");
  const printPresentation = await cardPresentationMetrics(card);

  expect(printPresentation).toEqual(screenPresentation);
});

const errorFixtures = [
  ["corrupt.zip", "ZIP_READ_FAILED"],
  ["missing-manifest.zip", "MANIFEST_MISSING"],
  ["invalid-manifest-json.zip", "MANIFEST_JSON_INVALID"],
  ["missing-modules-file.zip", "PACKAGE_FILE_MISSING"],
  ["unsafe-modules-path.zip", "PACKAGE_PATH_UNSAFE"],
  ["missing-module-reference.zip", "MISSING_MODULE_REFERENCE"],
] as const;

for (const [fileName, expectedCode] of errorFixtures) {
  test(`invalid System Package fixture ${fileName} shows ${expectedCode}`, async ({ page }, testInfo) => {
    await page.goto("/");
    await uploadPackage(page, await errorFixturePath(testInfo, fileName));

    await expect(page.getByRole("alert", { name: "System Package error" })).toContainText(expectedCode);
    await expect(page.getByLabel("Sheet Tool", { exact: true })).not.toBeVisible();
  });
}

test("invalid System Package zip keeps the current sheet when one is already loaded", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await demoPackagePath(testInfo));
  await page.getByLabel("姓名").fill("阿青");

  await uploadPackage(page, await errorFixturePath(testInfo, "missing-manifest.zip"));

  await expect(page.getByRole("alert", { name: "System Package error" })).toContainText("MANIFEST_MISSING");
  await expect(page.locator('[data-module-id="character-name"]')).toContainText("阿青");
});

test("invalid cached System Package is cleared and leaves upload controls usable", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await putInvalidCachedPackage(page);
  await page.reload();

  await expect(page.getByText("未加载")).toBeVisible();
  await expect(page.getByText("缓存的 System Package 已失效，已清除。请重新上传系统包。")).toBeVisible();
  await expect(page.getByRole("button", { name: /System Package zip/ })).toBeEnabled();
  await expect(page.getByLabel("Sheet Tool", { exact: true })).not.toBeVisible();
  expect(pageErrors).toEqual([]);

  await page.reload();
  await expect(page.getByText("未加载")).toBeVisible();
  await expect(page.getByText("缓存的 System Package 已失效")).not.toBeVisible();
});

async function uploadPackage(page: Page, packagePath: string) {
  await openSystemPackageMenu(page);
  const packageChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /System Package zip/ }).click();
  const packageChooser = await packageChooserPromise;
  await packageChooser.setFiles(packagePath);
}

async function openSystemPackageMenu(page: Page) {
  await page.getByRole("button", { name: "系统包", exact: true }).click();
}

async function openPlayerMenu(page: Page) {
  await page.getByRole("button", { name: "玩家功能", exact: true }).click();
}

async function openExportMenu(page: Page) {
  await page.getByRole("button", { name: "导入导出", exact: true }).click();
}

async function selectDaggerheartSkin(page: Page, skinId: string) {
  await openSystemPackageMenu(page);
  const select = page.locator("select.menu-select", { has: page.locator(`option[value="${skinId}"]`) });
  await expect(select).toHaveCount(1);
  await select.selectOption(skinId);
}

async function waitForAutosave(page: Page) {
  await page.waitForTimeout(350);
}

async function downloadCharacterJson(page: Page) {
  const downloadPromise = page.waitForEvent("download");
  await openExportMenu(page);
  await page.getByRole("button", { name: "导出 Character JSON" }).click();
  const continueButton = page.getByRole("button", { name: "继续输出" });
  try {
    await continueButton.click({ timeout: 500 });
  } catch {
    // No advisory validation report appeared; output can continue directly.
  }
  return downloadPromise;
}

async function downloadHtmlSnapshot(page: Page) {
  const downloadPromise = page.waitForEvent("download");
  await openExportMenu(page);
  await page.getByRole("button", { name: "导出 HTML snapshot" }).click();
  const continueButton = page.getByRole("button", { name: "继续输出" });
  try {
    await continueButton.click({ timeout: 500 });
  } catch {
    // No advisory validation report appeared; output can continue directly.
  }
  return downloadPromise;
}

async function cardDescriptionMetrics(description: Locator) {
  return description.evaluate((element) => {
    const html = element as HTMLElement;
    return {
      fontSizePx: Number.parseFloat(getComputedStyle(html).fontSize),
      clientHeight: html.clientHeight,
      scrollHeight: html.scrollHeight,
    };
  });
}

async function cardPresentationMetrics(card: Locator) {
  return card.evaluate((element) => {
    const cardElement = element as HTMLElement;
    const cardRect = cardElement.getBoundingClientRect();
    const face = cardElement.querySelector<HTMLElement>(".play-card-text")!;
    const name = cardElement.querySelector<HTMLElement>(".play-card-name")!;
    const tag = cardElement.querySelector<HTMLElement>(".play-card-tag")!;
    const description = cardElement.querySelector<HTMLElement>(".play-card-description")!;
    const roundedRect = (target: HTMLElement) => {
      const rect = target.getBoundingClientRect();
      return {
        x: Math.round((rect.x - cardRect.x) * 100) / 100,
        y: Math.round((rect.y - cardRect.y) * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
      };
    };
    const pickedStyle = (target: HTMLElement) => {
      const style = getComputedStyle(target);
      return {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        color: style.color,
        backgroundColor: style.backgroundColor,
        padding: style.padding,
        gap: style.gap,
      };
    };
    return {
      card: { width: Math.round(cardRect.width * 100) / 100, height: Math.round(cardRect.height * 100) / 100 },
      face: { rect: roundedRect(face), style: pickedStyle(face) },
      name: { rect: roundedRect(name), style: pickedStyle(name) },
      tag: { rect: roundedRect(tag), style: pickedStyle(tag) },
      description: { rect: roundedRect(description), style: pickedStyle(description) },
    };
  });
}

async function createCardFitPackage(testInfo: TestInfo): Promise<string> {
  const mediumDescription = [
    "**守护反击：**当近距离内的盟友受到攻击时，你可以标记 1 压力，使自己成为这次攻击的目标。",
    "成功防御后选择一项：",
    "- 对攻击者造成等同于熟练值的物理伤害。",
    "- 将攻击者击退到远距离。",
    "- 让被保护的盟友清除 1 压力并移动到安全位置。",
    ":blue[若盟友只剩 1 生命点，你获得 1 希望。]",
  ].join("\n\n");
  const extremeDescription = Array.from(
    { length: 24 },
    (_, index) => `**极端内容段落 ${index + 1}：**这是一段用于确认九像素下限仍然无法完整容纳时会显示独立省略号角标的中文规则文字。`,
  ).join("\n\n");
  const files: Record<string, Uint8Array> = {
    "manifest.json": jsonBytes({
      ID: "card-fit-e2e",
      名称: "Card 描述拟合测试包",
      版本: "0.1.0",
      schemaVersion: "0.1.0",
      pages: "pages.json",
      modules: "modules.json",
      resourceLibraries: [{ ID: "fit-cards", 名称: "拟合卡牌", 路径: "resources/cards.json" }],
    }),
    "pages.json": jsonBytes([
      { ID: "main", 名称: "拟合测试", layout: { 类型: "htmlTemplate", html: "layouts/main.html", css: "layouts/main.css" } },
    ]),
    "modules.json": jsonBytes([
      {
        ID: "add-fit-card",
        类型: "resourcePicker",
        按钮文本: "添加测试卡",
        资源库: [{ ID: "fit-cards" }],
        创建卡牌: { 卡牌桌面模块ID: "fit-card-table", 默认状态: "configured" },
      },
      {
        ID: "fit-card-table",
        类型: "cardTable",
        标签: "测试卡牌桌面",
        资源来源: [{ 类型: "resourceLibrary", ID: "fit-cards" }],
        显示方式: "text",
      },
    ]),
    "resources/cards.json": jsonBytes([
      { ID: "fit-card", 名称: "自动拟合卡", 类型: "能力", 等级: "3", 描述: mediumDescription },
      { ID: "overflow-card", 名称: "极端长文本卡", 类型: "能力", 等级: "9", 描述: extremeDescription },
    ]),
    "layouts/main.html": strToU8('<main class="card-fit-test"><pb-module id="add-fit-card"></pb-module><pb-module id="fit-card-table"></pb-module></main>'),
    "layouts/main.css": strToU8(".card-fit-test { width: min(56rem, 100%); }"),
  };
  const packagePath = path.join(testInfo.outputDir, "card-fit-package.zip");
  await mkdir(testInfo.outputDir, { recursive: true });
  await writeFile(packagePath, zipSync(files));
  return packagePath;
}

function jsonBytes(value: unknown): Uint8Array {
  return strToU8(JSON.stringify(value));
}

async function putInvalidCachedPackage(page: Page) {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("pbdh-sheet");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      if (!db.objectStoreNames.contains("systemPackages")) {
        db.close();
        reject(new Error("systemPackages object store missing"));
        return;
      }

      const transaction = db.transaction("systemPackages", "readwrite");
      transaction.objectStore("systemPackages").put({
        id: "current-system-package",
        packageId: "stale-selection",
        data: {
          manifest: {
            ID: "stale-selection",
            名称: "旧包",
            版本: "1.0.0",
            schemaVersion: "0.1.0",
          },
          pages: [
            {
              ID: "main",
              名称: "Main",
              layout: {
                类型: "htmlTemplate",
                html: "layouts/main.html",
                htmlContent: '<pb-module id="legacy-selection"></pb-module>',
              },
            },
          ],
          modules: [
            {
              ID: "legacy-selection",
              类型: "selectionText",
              标签: "旧选择文本",
            },
          ],
        },
      });
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
      transaction.onabort = () => {
        db.close();
        reject(transaction.error);
      };
    });
  });
}

function demoPackagePath(testInfo: TestInfo) {
  return createExamplePackageArchive(testInfo, "demo-minimal");
}

async function pageBoxMetrics(pageBox: Locator) {
  return pageBox.evaluate((element) => {
    const html = element as HTMLElement;
    const rect = html.getBoundingClientRect();
    const style = getComputedStyle(html);
    return {
      width: rect.width,
      height: rect.height,
      clientWidth: html.clientWidth,
      clientHeight: html.clientHeight,
      scrollWidth: html.scrollWidth,
      scrollHeight: html.scrollHeight,
      padding: style.padding,
    };
  });
}

function completeDemoPackagePath(testInfo: TestInfo) {
  return createExamplePackageArchive(testInfo, "demo");
}

function createExamplePackageArchive(testInfo: TestInfo, packageName: string) {
  return createPackageArchive(
    testInfo,
    path.join(process.cwd(), "docs", "system-package", "examples", packageName),
    `${packageName}.zip`,
  );
}

function createPublicPackageArchive(testInfo: TestInfo, packageName: string) {
  return createPackageArchive(
    testInfo,
    path.join(process.cwd(), "public", "system-packages", packageName),
    `${packageName}.zip`,
  );
}

async function createDaggerheartCorePackage(testInfo: TestInfo): Promise<string> {
  return createPublicPackageArchive(testInfo, "daggerheart-core");
}

async function createPackageArchive(testInfo: TestInfo, packageRoot: string, fileName: string): Promise<string> {
  const files = Object.fromEntries(
    await Promise.all(
      (await walkPackageFiles(packageRoot)).map(async (file) => [
        path.relative(packageRoot, file).replaceAll("\\", "/"),
        await readFile(file),
      ]),
    ),
  );
  const packagePath = path.join(testInfo.outputDir, fileName);
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

function errorFixturePath(testInfo: TestInfo, fileName: string) {
  const fixtureRoot = path.join(process.cwd(), "tests", "fixtures", "system-packages", "errors");
  if (fileName === "corrupt.zip") return path.join(fixtureRoot, fileName);
  return createPackageArchive(testInfo, path.join(fixtureRoot, path.parse(fileName).name), fileName);
}

const tinyPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
