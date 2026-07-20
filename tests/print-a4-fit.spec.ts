import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

interface BuiltInPackageCase {
  directory: string;
  id: string;
  skins: Array<{ ID: string; 名称: string }>;
}

interface A4SurfaceMetric {
  pageId: string;
  width: number;
  height: number;
  rightOverflow: number;
  bottomOverflow: number;
  widestElement: string;
  lowestElement: string;
  overflowSources: string[];
  countableOverflows: Array<{ moduleId: string; right: number; bottom: number }>;
}

const packagesRoot = path.join(process.cwd(), "public", "system-packages");
const builtInPackages = readdirSync(packagesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry): BuiltInPackageCase => {
    const manifest = JSON.parse(readFileSync(path.join(packagesRoot, entry.name, "manifest.json"), "utf8")) as {
      ID: string;
      skins?: Array<{ ID: string; 名称: string }>;
    };
    return { directory: entry.name, id: manifest.ID, skins: manifest.skins ?? [] };
  });

test.describe("every built-in System Package Skin fits every printable surface inside A4", () => {
  for (const systemPackage of builtInPackages) {
    for (const skin of systemPackage.skins) {
      test(`${systemPackage.id}/${skin.ID} (${skin.名称})`, async ({ page }) => {
        test.setTimeout(60_000);
        await page.goto("/");
        await selectPreset(page, systemPackage.id);
        if (systemPackage.id === "daggerheart-core") await revealDaggerheartConditionalPages(page);
      await page.emulateMedia({ media: "screen" });
      await selectSkin(page, skin.ID);
      const metrics = await capturePrintMetrics(page);
      if (systemPackage.id === "daggerheart-core") {
        await page.emulateMedia({ media: "screen" });
        await revealDaggerheartCompanionPage(page);
        metrics.push(...(await capturePrintMetrics(page)).map((metric) => ({
          ...metric,
          pageId: `companion-state/${metric.pageId}`,
        })));
      }
      expect(metrics.length, `${systemPackage.id}/${skin.ID} (${skin.名称}) rendered no printable surfaces`).toBeGreaterThan(0);

      const overflow = metrics.filter((metric) => metric.rightOverflow > 0.5
        || metric.bottomOverflow > 0.5
        || metric.countableOverflows.some((item) => item.right > 0.5 || item.bottom > 0.5));
      expect(overflow, formatOverflow(systemPackage.id, skin, overflow)).toEqual([]);
      for (const metric of metrics) {
        expect(metric.width, `${systemPackage.id}/${skin.ID}/${metric.pageId} width`).toBeCloseTo(210 / 25.4 * 96, 0);
        expect(metric.height, `${systemPackage.id}/${skin.ID}/${metric.pageId} height`).toBeCloseTo(297 / 25.4 * 96, 0);
      }
      });
    }
  }
});

async function selectPreset(page: Page, packageId: string) {
  await openSystemPackageMenu(page);
  await page.getByRole("combobox", { name: "预制系统包" }).selectOption(packageId);
  await expect(page.locator(`[data-system-package-id="${packageId}"]`)).toBeVisible();
}

async function selectSkin(page: Page, skinId: string) {
  await openSystemPackageMenu(page);
  const select = page.getByRole("combobox", { name: /^人物卡皮肤/ });
  if (await select.count() === 0) {
    await expect(page.locator(`style[data-system-package-skin="${skinId}"]`)).toHaveCount(1);
    return;
  }
  await expect(select.locator(`option[value="${skinId}"]`)).toHaveCount(1);
  await select.selectOption(skinId);
  await expect(page.locator(`style[data-system-package-skin="${skinId}"]`)).toHaveCount(1);
}

async function openSystemPackageMenu(page: Page) {
  const presets = page.getByRole("combobox", { name: "预制系统包" });
  if (!await presets.isVisible()) await page.getByRole("button", { name: "系统包", exact: true }).click();
  await expect(presets).toBeVisible();
}

async function revealDaggerheartConditionalPages(page: Page) {
  const classPicker = page.locator('[data-module-id="pick-class"]');
  await classPicker.getByRole("button").click();
  await page.getByLabel("选择 德鲁伊").click();
  await expect(page.getByRole("button", { name: "野兽形态 T1-T2", exact: true })).toBeVisible();
}

async function revealDaggerheartCompanionPage(page: Page) {
  const classPicker = page.locator('[data-module-id="pick-class"]');
  await classPicker.getByRole("button").click();
  await page.getByLabel("选择 游侠").first().click();
  const subclassPicker = page.locator('[data-module-id="pick-subclass"]');
  await subclassPicker.getByRole("button").click();
  await page.getByLabel("选择 驯兽大师").first().click();
  await expect(page.getByRole("button", { name: "游侠动物伙伴", exact: true })).toBeVisible();
}

async function capturePrintMetrics(page: Page): Promise<A4SurfaceMetric[]> {
  await openExportMenu(page);
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => {
    delete document.documentElement.dataset.a4FitProbe;
    window.print = () => {
      const surfaces = [...document.querySelectorAll<HTMLElement>('.sheet-page, [data-print-page="true"]')];
      document.documentElement.dataset.a4FitProbe = JSON.stringify(surfaces.map((surface) => {
        const visuallyHidden = [...surface.querySelectorAll<HTMLElement>(".visually-hidden")];
        const previousDisplay = visuallyHidden.map((element) => element.style.display);
        visuallyHidden.forEach((element) => { element.style.display = "none"; });
        const surfaceRect = surface.getBoundingClientRect();
        const descendants = [...surface.querySelectorAll<HTMLElement>("*")]
          .filter((element) => {
            const style = getComputedStyle(element);
            return !element.classList.contains("visually-hidden") && style.display !== "none" && style.position !== "fixed";
          })
          .map((element) => ({ element, rect: element.getBoundingClientRect() }));
        const widest = descendants.reduce((current, candidate) => candidate.rect.right > current.rect.right ? candidate : current, { element: surface, rect: surfaceRect });
        const lowest = descendants.reduce((current, candidate) => candidate.rect.bottom > current.rect.bottom ? candidate : current, { element: surface, rect: surfaceRect });
        const widestInternal = descendants.reduce((current, candidate) => candidate.element.scrollWidth - candidate.element.clientWidth > current.element.scrollWidth - current.element.clientWidth ? candidate : current, { element: surface, rect: surfaceRect });
        const lowestInternal = descendants.reduce((current, candidate) => candidate.element.scrollHeight - candidate.element.clientHeight > current.element.scrollHeight - current.element.clientHeight ? candidate : current, { element: surface, rect: surfaceRect });
        const label = (element: HTMLElement) => [
          element.dataset.moduleId,
          element.closest<HTMLElement>("[data-module-id]")?.dataset.moduleId
            ? `${element.closest<HTMLElement>("[data-module-id]")!.dataset.moduleId}/${element.className?.toString().split(/\s+/).filter(Boolean).slice(0, 2).join(".") || element.tagName.toLowerCase()}`
            : undefined,
          element.dataset.moduleSlotId,
          element.id,
          element.className?.toString().split(/\s+/).filter(Boolean).slice(0, 2).join("."),
          element.tagName.toLowerCase(),
        ].find(Boolean)!;
        const overflowSources = [{ element: surface, rect: surfaceRect }, ...descendants]
          .map(({ element }) => ({ label: label(element), right: element.scrollWidth - element.clientWidth, bottom: element.scrollHeight - element.clientHeight }))
          .filter((item) => item.right > 0.5 || item.bottom > 0.5)
          .sort((left, right) => Math.max(right.right, right.bottom) - Math.max(left.right, left.bottom))
          .slice(0, 5)
          .map((item) => `${item.label}:right=${item.right.toFixed(2)},bottom=${item.bottom.toFixed(2)}`);
        const countableOverflows = [...surface.querySelectorAll<HTMLElement>('[data-module-type="countableResource"] .marker-group')]
          .map((group) => {
            const groupRect = group.getBoundingClientRect();
            const cells = [...group.querySelectorAll<HTMLElement>('.marker-cell')];
            const right = Math.max(group.scrollWidth - group.clientWidth, ...cells.map((cell) => cell.getBoundingClientRect().right - groupRect.right), 0);
            const bottom = Math.max(group.scrollHeight - group.clientHeight, ...cells.map((cell) => cell.getBoundingClientRect().bottom - groupRect.bottom), 0);
            return {
              moduleId: group.closest<HTMLElement>('[data-module-id]')?.dataset.moduleId ?? "unknown-countable",
              right,
              bottom,
            };
          })
          .filter((item) => item.right > 0.5 || item.bottom > 0.5);
        const metric = {
          pageId: surface.matches(".sheet-page")
            ? surface.dataset.templatePageId ?? surface.querySelector<HTMLElement>("[data-template-page-id]")?.dataset.templatePageId ?? "sheet-page"
            : "shell-card-page",
          width: surfaceRect.width,
          height: surfaceRect.height,
          rightOverflow: Math.max(0, surface.scrollWidth - surface.clientWidth, widest.rect.right - surfaceRect.right),
          bottomOverflow: Math.max(0, surface.scrollHeight - surface.clientHeight, lowest.rect.bottom - surfaceRect.bottom),
          widestElement: label(widestInternal.element === surface ? widest.element : widestInternal.element),
          lowestElement: label(lowestInternal.element === surface ? lowest.element : lowestInternal.element),
          overflowSources,
          countableOverflows,
        };
        visuallyHidden.forEach((element, index) => { element.style.display = previousDisplay[index]; });
        return metric;
      }));
    };
  });

  await page.locator('button[aria-label="打开浏览器打印 PDF"]').evaluate((button) => (button as HTMLButtonElement).click());
  await expect.poll(() => page.evaluate(() => Boolean(
    document.documentElement.dataset.a4FitProbe || document.querySelector('button[aria-label="继续输出"]'),
  ))).toBe(true);
  const continueButton = page.locator('button[aria-label="继续输出"]');
  const probeReady = await page.evaluate(() => Boolean(document.documentElement.dataset.a4FitProbe));
  if (!probeReady && await continueButton.count()) {
    await continueButton.evaluate((button) => (button as HTMLButtonElement).click());
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.a4FitProbe)).not.toBeUndefined();
  const metrics = JSON.parse(await page.evaluate(() => document.documentElement.dataset.a4FitProbe!)) as A4SurfaceMetric[];
  await expect(page.locator(".app-shell")).not.toHaveClass(/print-mode/);
  return metrics;
}

async function openExportMenu(page: Page) {
  const printButton = page.getByRole("button", { name: "打开浏览器打印 PDF" });
  if (!await printButton.isVisible()) await page.getByRole("button", { name: "导入导出", exact: true }).click();
  await expect(printButton).toBeVisible();
}

function formatOverflow(packageId: string, skin: { ID: string; 名称: string }, metrics: A4SurfaceMetric[]) {
  if (metrics.length === 0) return `${packageId}/${skin.ID} (${skin.名称}) fits A4`;
  return [
    `${packageId}/${skin.ID} (${skin.名称}) exceeds A4:`,
    ...metrics.map((metric) => `  ${metric.pageId}: right=${metric.rightOverflow.toFixed(2)}px (${metric.widestElement}), bottom=${metric.bottomOverflow.toFixed(2)}px (${metric.lowestElement}); countables=${metric.countableOverflows.map((item) => `${item.moduleId}:right=${item.right.toFixed(2)},bottom=${item.bottom.toFixed(2)}`).join(" | ")}; sources=${metric.overflowSources.join(" | ")}`),
  ].join("\n");
}
