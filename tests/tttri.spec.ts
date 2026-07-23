import { expect, test } from "@playwright/test";

test("TTTRI Terra Portal pages stay inside A4 and print without blank sheets", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "系统包", exact: true }).click();
  await page.getByRole("combobox", { name: "预制系统包" }).selectOption("tttri");
  await expect(page.locator('[data-system-package-id="tttri"]')).toBeVisible();
  await page.getByRole("combobox", { name: "人物卡皮肤" }).selectOption("terra-portal");
  await page.locator('[data-module-slot-id="pick-ancestry"]').getByRole("button", { name: "选择种族" }).click();
  await page.getByLabel("选择 乌萨斯").click();
  await expect(page.locator(".play-card-text")).toHaveCount(1);

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
    delete document.documentElement.dataset.tttriCurrencyProbe;
    delete document.documentElement.dataset.tttriLightPrintProbe;
    delete document.documentElement.dataset.tttriPrintSnapshot;
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
      const currencyElements = document.querySelectorAll<HTMLElement>([
        '.currency-row [data-module-type="countableResource"]',
        '.currency-row [data-module-type="countableResource"] > [data-part="label"]',
        '.currency-row [data-module-type="countableResource"] [data-part="counter"]',
      ].join(", "));
      document.documentElement.dataset.tttriCurrencyProbe = JSON.stringify(
        [...currencyElements].map((element) => getComputedStyle(element).backgroundColor),
      );
      const lightPrintBackgrounds = document.querySelectorAll<HTMLElement>([
        ".advancement-region > h2",
        ".advancement-grid article",
        '.advancement-grid [data-module-type]',
        ".play-card-text",
      ].join(", "));
      const lightPrintText = document.querySelectorAll<HTMLElement>([
        ".advancement-region > h2",
        ".advancement-grid article h3",
        '.advancement-grid [data-part="value"]',
        '.advancement-grid [data-part="option-label"]',
        ".play-card-text",
      ].join(", "));
      document.documentElement.dataset.tttriLightPrintProbe = JSON.stringify(
        {
          backgrounds: [...lightPrintBackgrounds].map((element) => getComputedStyle(element).backgroundColor),
          colors: [...lightPrintText].map((element) => getComputedStyle(element).color),
        },
      );
      document.documentElement.dataset.tttriPrintSnapshot = document.querySelector<HTMLElement>(".sheet-tool")?.outerHTML ?? "";
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

  const currencyPrintSurfaces = JSON.parse(await page.evaluate(() => document.documentElement.dataset.tttriCurrencyProbe ?? "[]")) as string[];
  expect(currencyPrintSurfaces.length).toBeGreaterThan(0);
  expect(new Set(currencyPrintSurfaces), `金币区打印底色：${currencyPrintSurfaces.join(", ")}`).toEqual(new Set(["rgb(255, 255, 255)"]));

  const lightPrintSurfaces = JSON.parse(await page.evaluate(() => document.documentElement.dataset.tttriLightPrintProbe ?? "{}")) as { backgrounds?: string[]; colors?: string[] };
  expect(lightPrintSurfaces.backgrounds?.length).toBeGreaterThan(0);
  expect(lightPrintSurfaces.colors?.length).toBeGreaterThan(0);
  expect(new Set(lightPrintSurfaces.backgrounds), `升级记录打印底色：${JSON.stringify(lightPrintSurfaces)}`).toEqual(new Set(["rgb(255, 255, 255)"]));
  expect(new Set(lightPrintSurfaces.colors), `升级记录打印文字：${JSON.stringify(lightPrintSurfaces)}`).toEqual(new Set(["rgb(17, 17, 17)"]));

  await page.evaluate(() => {
    document.body.className = "print-mode";
    document.body.innerHTML = document.documentElement.dataset.tttriPrintSnapshot ?? "";
  });
  const printedPdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
  const printedPageCount = printedPdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0;
  expect(printedPageCount, "TTTRI should emit exactly its three declared print surfaces").toBe(3);
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
