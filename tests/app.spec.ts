import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

test("minimal loop edits, autosaves, exports and imports Character JSON", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByText("未加载")).toBeVisible();
  await expect(page.getByLabel("Sheet Tool", { exact: true })).not.toBeVisible();

  await uploadPackage(page, demoPackagePath());

  const nameInput = page.getByLabel("姓名");
  await expect(nameInput).toBeVisible();
  await nameInput.fill("阿青");
  await waitForAutosave(page);

  const htmlDownload = await downloadHtmlSnapshot(page);
  const htmlExportPath = path.join(testInfo.outputDir, "character.html");
  await htmlDownload.saveAs(htmlExportPath);
  const htmlExport = await readFile(htmlExportPath, "utf8");
  expect(htmlExport).toContain('class="sheet-tool"');
  expect(htmlExport).toContain('value="阿青"');
  expect(htmlExport).toContain("break-inside: avoid");

  await page.reload();
  await expect(page.getByText("最小示例系统包")).toBeVisible();
  await expect(page.getByLabel("姓名")).toHaveValue("阿青");

  const download = await downloadCharacterJson(page);
  const exportPath = path.join(testInfo.outputDir, "character.json");
  await download.saveAs(exportPath);

  await page.getByLabel("姓名").fill("改坏的名字");
  await waitForAutosave(page);

  const fileChooserPromise = page.waitForEvent("filechooser");
  await openExportMenu(page);
  await page.getByRole("button", { name: "导入 Character JSON" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(exportPath);

  await expect(page.getByLabel("姓名")).toHaveValue("阿青");
  await expect(page.getByText("Character Data 已导入为 Character Save。")).toBeVisible();
});

test("malformed import shows an error and keeps current Character Data", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, demoPackagePath());
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
  await expect(page.getByLabel("姓名")).toHaveValue("阿青");
});

test("uploads a minimal System Package zip and keeps the Character JSON loop", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, demoPackagePath());

  await expect(page.getByText("最小示例系统包")).toBeVisible();
  await page.getByLabel("姓名").fill("Zip阿青");
  await waitForAutosave(page);

  const download = await downloadCharacterJson(page);
  const exportPath = path.join(testInfo.outputDir, "zip-character.json");
  await download.saveAs(exportPath);

  await page.getByLabel("姓名").fill("临时名字");
  await waitForAutosave(page);

  const characterChooserPromise = page.waitForEvent("filechooser");
  await openExportMenu(page);
  await page.getByRole("button", { name: "导入 Character JSON" }).click();
  const characterChooser = await characterChooserPromise;
  await characterChooser.setFiles(exportPath);
  await expect(page.getByLabel("姓名")).toHaveValue("Zip阿青");
  await page.waitForTimeout(400);

  await page.reload();
  await expect(page.getByText("最小示例系统包")).toBeVisible();
  await expect(page.getByLabel("姓名")).toHaveValue("Zip阿青");
});

test("uploads the phase 5 module demo package and persists simple module state", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, moduleDemoPackagePath());

  await expect(page.getByText("阶段5模块示例系统包", { exact: true })).toBeVisible();
  await expect(page.locator(".demo-sheet")).toBeVisible();
  await expect(page.locator(".identity")).toBeVisible();
  await expect(page.locator('[data-module-slot-id="background"]')).toBeVisible();
  await expect(page.getByAltText("阶段5示例徽记")).toBeVisible();
  await expect(page.getByRole("img", { name: "角色头像" })).toContainText("图片不可用");

  const avatarPath = path.join(testInfo.outputDir, "avatar.png");
  await mkdir(testInfo.outputDir, { recursive: true });
  await writeFile(avatarPath, Buffer.from(tinyPngBase64, "base64"));
  const imageChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "上传图片" }).click();
  const imageChooser = await imageChooserPromise;
  await imageChooser.setFiles(avatarPath);
  await expect(page.getByAltText("角色头像")).toBeVisible();

  await page.getByLabel("姓名").fill("陆青");
  await page.getByLabel("背景").fill("第一行\n第二行");
  await page.getByLabel("受伤").check();
  await page.getByRole("button", { name: "气力增加" }).click();
  await page.getByRole("button", { name: "气力增加" }).click();
  await expect(page.getByRole("textbox", { name: "气力", exact: true })).toHaveValue("5");
  await waitForAutosave(page);

  await page.reload();
  await expect(page.getByText("阶段5模块示例系统包", { exact: true })).toBeVisible();
  await expect(page.getByLabel("姓名")).toHaveValue("陆青");
  await expect(page.getByLabel("背景")).toHaveValue("第一行\n第二行");
  await expect(page.getByLabel("受伤")).toBeChecked();
  await expect(page.getByRole("textbox", { name: "气力", exact: true })).toHaveValue("5");

  const download = await downloadCharacterJson(page);
  const exportPath = path.join(testInfo.outputDir, "module-character.json");
  await download.saveAs(exportPath);

  const exported = JSON.parse(await readFile(exportPath, "utf8"));
  expect(exported.character.values.background).toBe("第一行\n第二行");
  expect(exported.character.values.conditions).toMatchObject({ wounded: true, inspired: true });
  expect(exported.character.values.vitality).toEqual({ current: 5, max: 6 });
  expect(exported.character.values["rule-note"]).toBeUndefined();
  expect(exported.character.values["sect-emblem"]).toBeUndefined();
  expect(exported.character.values.portrait).toMatchObject({ kind: "player-image" });
  expect(exported.playerImages[exported.character.values.portrait.imageId].dataUrl).toMatch(/^data:image\/png;base64,/);

  await page.getByLabel("姓名").fill("改坏");
  const characterChooserPromise = page.waitForEvent("filechooser");
  await openExportMenu(page);
  await page.getByRole("button", { name: "导入 Character JSON" }).click();
  const characterChooser = await characterChooserPromise;
  await characterChooser.setFiles(exportPath);

  await expect(page.getByLabel("姓名")).toHaveValue("陆青");
  await expect(page.getByLabel("背景")).toHaveValue("第一行\n第二行");
  await expect(page.getByAltText("角色头像")).toBeVisible();
});

test("uploads Resource Picker demo and restores filled text through export/import", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByText("未加载")).toBeVisible();
  await uploadPackage(page, selectionDemoPackagePath());

  await expect(page.getByText("资源库选择示例系统包")).toBeVisible();
  const classPicker = page.locator('[data-module-id="pick-class"]');
  await classPicker.getByRole("button", { name: "选择职业" }).click();
  const classDialog = page.getByRole("dialog", { name: "职业资源库" });
  await expect(classDialog).toBeVisible();
  await expect(classDialog.getByRole("columnheader", { name: "ID" })).toHaveCount(0);
  await expect(classDialog.getByRole("columnheader", { name: "原名" })).toHaveCount(0);
  await expect.poll(() => resourceDialogWidth(classDialog)).toBeGreaterThan(1120);
  await expect.poll(() => resourceControlsWidth(classDialog)).toBeLessThan(190);
  await expect.poll(() => resourceTableHasHorizontalOverflow(classDialog)).toBe(false);
  expect(await resourceTableCellPadding(classDialog)).toEqual({
    paddingTop: "8px",
    paddingRight: "4px",
    paddingBottom: "8px",
    paddingLeft: "4px",
  });
  const classColumnWidths = await tableColumnWidths(classDialog);
  expect(classColumnWidths["领域1"]).toBeLessThan(classColumnWidths["希望特性"]);
  expect(classColumnWidths["职业特性"]).toBeGreaterThan(classColumnWidths["希望特性"]);
  await page.getByLabel("选择 德鲁伊").click();
  await expect(page.locator('[data-module-id="class-name"]').getByRole("textbox", { name: "职业", exact: true })).toHaveValue("德鲁伊");
  await expect(page.locator('[data-module-id="class-domains"]').getByRole("textbox", { name: "领域", exact: true })).toHaveValue("贤者+奥术");
  await expect(page.getByText(/你成长的社群为何如此依赖自然/)).toBeVisible();
  await expect(page.locator('[data-module-id="druid-shape-note"]')).toBeVisible();
  await expect(page.locator('[data-template-page-id="druid-shape-page"]')).toBeVisible();

  await page.locator('[data-module-id="pick-subclass"]').getByRole("button", { name: "选择子职" }).click();
  const subclassDialog = page.getByRole("dialog", { name: "子职资源库" });
  await expect(subclassDialog).toBeVisible();
  await expect(page.getByLabel("选择 元素结社-基础")).toBeVisible();
  await expect(page.getByLabel("选择 勇气呼唤-基础")).not.toBeVisible();
  await subclassDialog.getByRole("checkbox", { name: "德鲁伊" }).uncheck();
  await expect(page.getByLabel("选择 勇气呼唤-基础")).toBeVisible();
  await page.getByRole("button", { name: "关闭资源库" }).click();

  await page.getByLabel("显示背景提示").check();
  await expect(page.locator('[data-module-id="background-helper"]').getByRole("textbox", { name: "背景提示", exact: true })).toHaveValue(
    "把职业背景问题复制到角色背景时，可以先回答其中一个问题，再改写成自己的经历。",
  );

  const single = page.locator('[data-module-id="pick-domain-card"]');
  await single.getByRole("button", { name: "选择领域卡" }).click();
  await expect(page.getByRole("dialog", { name: "领域卡资源库" })).toBeVisible();
  await expect(page.getByLabel("选择 灵巧机动")).not.toBeVisible();
  await page.getByLabel("排序字段").selectOption("名称");
  await page.getByLabel("选择 卷土重来").click();
  await expect(page.locator('[data-module-id="domain-card-name"]').getByRole("textbox", { name: "领域卡", exact: true })).toHaveValue("卷土重来");
  await expect(page.locator('[data-module-id="domain-card-table"]')).toBeVisible();
  await expect(page.getByAltText("卷土重来")).toBeVisible();
  await page.locator(".play-card", { has: page.getByAltText("卷土重来") }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "标记为宝库" }).click();
  await waitForAutosave(page);

  await page.reload();
  await expect(page.getByText("资源库选择示例系统包")).toBeVisible();
  await expect(page.locator('[data-module-id="class-name"]').getByRole("textbox", { name: "职业", exact: true })).toHaveValue("德鲁伊");
  await expect(page.locator('[data-module-id="domain-card-name"]').getByRole("textbox", { name: "领域卡", exact: true })).toHaveValue("卷土重来");
  await expect(page.locator('[data-template-page-id="druid-shape-page"]')).toHaveCount(0);

  const download = await downloadCharacterJson(page);
  const exportPath = path.join(testInfo.outputDir, "selection-character.json");
  await download.saveAs(exportPath);

  const exportedText = await readFile(exportPath, "utf8");
  const exported = JSON.parse(exportedText);
  expect(exported.character.values["class-name"]).toBe("德鲁伊");
  expect(exported.character.values["class-domains"]).toBe("贤者+奥术");
  expect(exported.character.values["domain-card-name"]).toBe("卷土重来");
  expect(exported.cards.instances).toEqual([
    expect.objectContaining({
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:卷土重来",
      state: "vault",
    }),
  ]);
  expect(exported.character.values["background-helper"]).toBe("把职业背景问题复制到角色背景时，可以先回答其中一个问题，再改写成自己的经历。");
  expect(exported.character.values["class-background-questions"]).toBeUndefined();
  expect(exported.character.values["druid-shape-note"]).toBeUndefined();
  expect(exported.character.values["pick-class"]).toBeUndefined();
  expect(exported.character.values["pick-subclass"]).toBeUndefined();
  expect(exported.character.values["pick-domain-card"]).toBeUndefined();
  expect(exportedText).not.toContain("resource-selection");
  expect(exportedText).not.toContain("assets/flame-card.svg");
  expect(exportedText).not.toContain("data:image");
  expect(exportedText).not.toContain("<svg");

  const domainCardName = page.locator('[data-module-id="domain-card-name"]').getByRole("textbox", { name: "领域卡", exact: true });
  await domainCardName.fill("临时领域卡");
  await expect(domainCardName).toHaveValue("临时领域卡");

  const characterChooserPromise = page.waitForEvent("filechooser");
  await openExportMenu(page);
  await page.getByRole("button", { name: "导入 Character JSON" }).click();
  const characterChooser = await characterChooserPromise;
  await characterChooser.setFiles(exportPath);

  await expect(page.locator('[data-module-id="domain-card-name"]').getByRole("textbox", { name: "领域卡", exact: true })).toHaveValue("卷土重来");
  await expect(page.locator(".play-card")).toContainText("domain-card:卷土重来");
});

test("Character Creation Guide spotlights interactive targets without taking over their behavior", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("未加载")).toBeVisible();
  await uploadPackage(page, selectionDemoPackagePath());

  await openSystemPackageMenu(page);
  await page.getByRole("button", { name: "启动车卡指引" }).click();
  const guide = page.getByRole("dialog", { name: "车卡指引" });
  await expect(guide).toContainText("开始创建角色");
  await expect(guide).toContainText("1 / 4");

  await guide.getByRole("button", { name: "下一步" }).click();
  await expect(guide).toContainText("选择职业");
  await expect(guide).toContainText("2 / 4");
  const classTarget = page.locator('[data-module-slot-id="pick-class"]');
  const ring = page.locator(".guide-target-ring");
  await expect(ring).toBeVisible();
  await expect.poll(() => page.locator(".top-bar").evaluate((element) => (element as HTMLElement).inert)).toBe(true);
  const targetBox = await classTarget.boundingBox();
  const ringBox = await ring.boundingBox();
  expect(targetBox).not.toBeNull();
  expect(ringBox).not.toBeNull();
  expect(ringBox!.x).toBeLessThanOrEqual(targetBox!.x);
  expect(ringBox!.y).toBeLessThanOrEqual(targetBox!.y);
  expect(ringBox!.width).toBeGreaterThanOrEqual(targetBox!.width);
  const panelBox = await guide.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(rectanglesOverlap(panelBox!, targetBox!)).toBe(false);

  await classTarget.getByRole("button", { name: "选择职业" }).click();
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
  await expect(guide).toContainText("2 / 4");

  await guide.getByRole("button", { name: "下一步" }).click();
  await expect(guide).toContainText("选择子职");
  await guide.getByRole("button", { name: "下一步" }).click();
  await expect(guide).toContainText("查看职业专属页面");
  await expect(page.locator('[data-template-page-id="druid-shape-page"]')).toBeVisible();
  await expect(page.getByText("当前目标不可见")).toHaveCount(0);
  await guide.getByRole("button", { name: "完成车卡指引" }).click();
  await expect(guide).not.toBeVisible();

  await page.reload();
  await openSystemPackageMenu(page);
  await page.getByRole("button", { name: "启动车卡指引" }).click();
  const restartedGuide = page.getByRole("dialog", { name: "车卡指引" });
  await expect(restartedGuide).toContainText("1 / 4");
  for (let step = 0; step < 3; step += 1) {
    await restartedGuide.getByRole("button", { name: "下一步" }).click();
  }
  await expect(restartedGuide).toContainText("当前目标不可见");
  await expect(page.locator('[data-template-page-id="druid-shape-page"]')).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(restartedGuide).not.toBeVisible();
  await expect(page.getByRole("button", { name: "启动车卡指引" })).toBeFocused();
});

test("Character Creation Guide uses a bottom panel on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto("/");
  await expect(page.getByText("未加载")).toBeVisible();
  await uploadPackage(page, selectionDemoPackagePath());
  await openSystemPackageMenu(page);
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

test("HTML Layout Template from demo zip stacks columns on small screens", async ({ page }) => {
  await page.goto("/");
  await uploadPackage(page, moduleDemoPackagePath());

  const identitySection = page.locator(".identity");
  await expect(identitySection).toBeVisible();
  await expect(page.getByLabel("姓名")).toBeVisible();
  await expect(page.getByRole("img", { name: "角色头像" })).toBeVisible();
  await expect(page.getByAltText("阶段5示例徽记")).toBeVisible();

  await expect(page.locator(".identity > .module-slot")).toHaveCount(3);
  await page.setViewportSize({ width: 480, height: 900 });
  await expect
    .poll(async () =>
      identitySection.evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length),
    )
    .toBe(1);
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
  test(`invalid System Package fixture ${fileName} shows ${expectedCode}`, async ({ page }) => {
    await page.goto("/");
    await uploadPackage(page, errorFixturePath(fileName));

    await expect(page.getByRole("alert", { name: "System Package error" })).toContainText(expectedCode);
    await expect(page.getByLabel("Sheet Tool", { exact: true })).not.toBeVisible();
  });
}

test("invalid System Package zip keeps the current sheet when one is already loaded", async ({ page }) => {
  await page.goto("/");
  await uploadPackage(page, demoPackagePath());
  await page.getByLabel("姓名").fill("阿青");

  await uploadPackage(page, errorFixturePath("missing-manifest.zip"));

  await expect(page.getByRole("alert", { name: "System Package error" })).toContainText("MANIFEST_MISSING");
  await expect(page.getByLabel("姓名")).toHaveValue("阿青");
});

test("invalid cached System Package is cleared and leaves upload controls usable", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await putInvalidCachedPackage(page);
  await page.reload();

  await expect(page.getByText("未加载")).toBeVisible();
  await expect(page.getByText("缓存的 System Package 已失效，已清除。请重新上传系统包。")).toBeVisible();
  await expect(page.getByRole("button", { name: "导入 System Package zip" })).toBeEnabled();
  await expect(page.getByLabel("Sheet Tool", { exact: true })).not.toBeVisible();
  expect(pageErrors).toEqual([]);

  await page.reload();
  await expect(page.getByText("未加载")).toBeVisible();
  await expect(page.getByText("缓存的 System Package 已失效")).not.toBeVisible();
});

async function uploadPackage(page: Page, packagePath: string) {
  await openSystemPackageMenu(page);
  const packageChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "导入 System Package zip" }).click();
  const packageChooser = await packageChooserPromise;
  await packageChooser.setFiles(packagePath);
}

async function openSystemPackageMenu(page: Page) {
  await page.locator(".top-menu").first().locator(".menu-trigger").click();
}

async function openExportMenu(page: Page) {
  await page.locator(".top-menu").nth(2).locator(".menu-trigger").click();
}

async function waitForAutosave(page: Page) {
  await page.waitForTimeout(350);
}

function rectanglesOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
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

async function tableColumnWidths(container: Locator) {
  return container.locator(".resource-table").evaluate((table) => {
    const headers = [...table.querySelectorAll("th")];
    return Object.fromEntries(headers.map((header) => [header.textContent?.trim() ?? "", header.getBoundingClientRect().width]));
  });
}

async function resourceDialogWidth(container: Locator) {
  return container.evaluate((dialog) => dialog.getBoundingClientRect().width);
}

async function resourceControlsWidth(container: Locator) {
  return container.locator(".resource-controls").evaluate((controls) => controls.getBoundingClientRect().width);
}

async function resourceTableHasHorizontalOverflow(container: Locator) {
  return container.locator(".resource-table-wrap").evaluate((wrapper) => wrapper.scrollWidth > wrapper.clientWidth + 1);
}

async function resourceTableCellPadding(container: Locator) {
  return container.locator(".resource-table td").first().evaluate((cell) => {
    const style = getComputedStyle(cell);
    return {
      paddingTop: style.paddingTop,
      paddingRight: style.paddingRight,
      paddingBottom: style.paddingBottom,
      paddingLeft: style.paddingLeft,
    };
  });
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

function demoPackagePath() {
  return path.join(process.cwd(), "public", "system-packages", "demo-minimal.zip");
}

function moduleDemoPackagePath() {
  return path.join(process.cwd(), "public", "system-packages", "demo-modules.zip");
}

function selectionDemoPackagePath() {
  return path.join(process.cwd(), "public", "system-packages", "demo-selection.zip");
}

function errorFixturePath(fileName: string) {
  return path.join(process.cwd(), "public", "system-packages", "error-fixtures", fileName);
}

const tinyPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
