import { expect, test } from "@playwright/test";

test("TTTRI plain pages stay inside the A4 page box on screen and in print", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "系统包", exact: true }).click();
  await page.getByRole("combobox", { name: "预制系统包" }).selectOption("tttri");
  await expect(page.locator('[data-system-package-id="tttri"]')).toBeVisible();

  for (const pageName of ["人物卡", "背景与关系"]) {
    await page.getByRole("button", { name: pageName, exact: true }).click();
    const pageBox = page.locator(".sheet-page");
    await expect(pageBox).toBeVisible();
    const metrics = await measurePage(pageBox);
    expect(metrics.width, pageName).toBeCloseTo(210 * 96 / 25.4, 0);
    expect(metrics.height, pageName).toBeCloseTo(297 * 96 / 25.4, 0);
    expect(metrics.horizontalOverflow, `${pageName}: ${metrics.rightmostElement}`).toBeLessThanOrEqual(1);
    expect(metrics.verticalOverflow, pageName).toBeLessThanOrEqual(1);
  }

  const printButton = page.locator('button[aria-label="打开浏览器打印 PDF"]');
  if (!await printButton.isVisible()) await page.getByRole("button", { name: "导入导出", exact: true }).click();
  await expect(printButton).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => {
    delete document.documentElement.dataset.tttriA4Probe;
    window.print = () => {
      const surfaces = [...document.querySelectorAll<HTMLElement>('.sheet-page, [data-print-page="true"]')];
      document.documentElement.dataset.tttriA4Probe = JSON.stringify(surfaces.map((element) => {
        const rect = element.getBoundingClientRect();
        const descendants = [...element.querySelectorAll<HTMLElement>("*")]
          .filter((item) => {
            const style = getComputedStyle(item);
            return style.display !== "none" && style.position !== "fixed";
          });
        const right = Math.max(rect.right, ...descendants.map((item) => item.getBoundingClientRect().right));
        const bottom = Math.max(rect.bottom, ...descendants.map((item) => item.getBoundingClientRect().bottom));
        const lowest = descendants.reduce((current, item) => item.getBoundingClientRect().bottom > current.getBoundingClientRect().bottom ? item : current, element);
        const label = (item: HTMLElement) => item.dataset.moduleId
          ?? item.closest<HTMLElement>("[data-module-id]")?.dataset.moduleId
          ?? item.dataset.guideRegionId
          ?? item.className?.toString().split(/\s+/).filter(Boolean).slice(0, 2).join(".")
          ?? item.tagName.toLowerCase();
        return {
          pageId: element.matches(".sheet-page")
            ? element.dataset.templatePageId ?? element.querySelector<HTMLElement>("[data-template-page-id]")?.dataset.templatePageId ?? "unknown"
            : "shell-card-page",
          width: rect.width,
          height: rect.height,
          horizontalOverflow: Math.max(element.scrollWidth - element.clientWidth, right - rect.right),
          verticalOverflow: Math.max(element.scrollHeight - element.clientHeight, bottom - rect.bottom),
          lowestElement: label(lowest),
          regionBottoms: [...element.querySelectorAll<HTMLElement>("[data-guide-region-id]")]
            .map((region) => ({ id: region.dataset.guideRegionId, bottom: region.getBoundingClientRect().bottom - rect.top })),
        };
      }));
    };
  });
  await printButton.evaluate((button) => (button as HTMLButtonElement).click());
  await expect.poll(() => page.evaluate(() => Boolean(
    document.documentElement.dataset.tttriA4Probe || document.querySelector('button[aria-label="继续输出"]'),
  ))).toBe(true);
  const continueButton = page.locator('button[aria-label="继续输出"]');
  if (!await page.evaluate(() => Boolean(document.documentElement.dataset.tttriA4Probe)) && await continueButton.count()) {
    await continueButton.evaluate((button) => (button as HTMLButtonElement).click());
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.tttriA4Probe)).not.toBeUndefined();
  const printMetrics = JSON.parse(await page.evaluate(() => document.documentElement.dataset.tttriA4Probe!)) as Array<{
    pageId: string;
    width: number;
    height: number;
    horizontalOverflow: number;
    verticalOverflow: number;
    lowestElement: string;
    regionBottoms: Array<{ id?: string; bottom: number }>;
  }>;

  expect(printMetrics).toHaveLength(3);
  for (const metrics of printMetrics) {
    expect(metrics.width, metrics.pageId).toBeCloseTo(210 * 96 / 25.4, 0);
    expect(metrics.height, metrics.pageId).toBeCloseTo(297 * 96 / 25.4, 0);
    expect(metrics.horizontalOverflow, metrics.pageId).toBeLessThanOrEqual(1);
    expect(metrics.verticalOverflow, `${metrics.pageId}: ${metrics.lowestElement}; regions=${JSON.stringify(metrics.regionBottoms)}`).toBeLessThanOrEqual(1);
  }
});

async function measurePage(pageBox: import("@playwright/test").Locator) {
  return pageBox.evaluate((element) => {
    const surface = element as HTMLElement;
    const rect = surface.getBoundingClientRect();
    const descendants = [...surface.querySelectorAll<HTMLElement>("*")].filter((item) => getComputedStyle(item).position !== "fixed");
    const rightmost = descendants.reduce((current, item) => item.getBoundingClientRect().right > current.getBoundingClientRect().right ? item : current, surface);
    const right = rightmost.getBoundingClientRect().right;
    const bottom = Math.max(rect.bottom, ...descendants.map((item) => item.getBoundingClientRect().bottom));
    return {
      width: rect.width,
      height: rect.height,
      horizontalOverflow: Math.max(surface.scrollWidth - surface.clientWidth, right - rect.right),
      verticalOverflow: Math.max(surface.scrollHeight - surface.clientHeight, bottom - rect.bottom),
      rightmostElement: [
        rightmost.tagName.toLowerCase(),
        rightmost.dataset.moduleId ?? rightmost.closest<HTMLElement>("[data-module-id]")?.dataset.moduleId,
        rightmost.className?.toString().split(/\s+/).filter(Boolean).slice(0, 2).join("."),
      ].filter(Boolean).join(":"),
    };
  });
}
