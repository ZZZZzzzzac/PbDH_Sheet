import { expect, test, type Page } from "@playwright/test";

test("Heart of Hopefind uses the same strict A4 geometry on screen and in print", async ({ page }) => {
  await page.goto("/");
  await selectPreset(page, "heart-of-hopefind");
  const expectedWidth = 210 * 96 / 25.4;
  const expectedHeight = 297 * 96 / 25.4;

  for (const pageId of ["character-sheet"]) {
    const pageBox = page.locator(`[data-template-page-id="${pageId}"]`);
    const screen = await pageGeometry(pageBox);
    await page.emulateMedia({ media: "print" });
    const print = await pageGeometry(pageBox);
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

test("Heart of Hopefind keeps the A4 layout on a narrow viewport instead of reflowing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await selectPreset(page, "heart-of-hopefind");

  const characterPage = page.locator('[data-template-page-id="character-sheet"]');
  const characterGeometry = await pageGeometry(characterPage);
  expect(characterGeometry.width).toBeCloseTo(210 * 96 / 25.4, 0);
  expect(characterGeometry.layoutColumns.trim().split(/\s+/)).toHaveLength(3);
  const phaseColumns = await characterPage.locator(".core-hurt-phases").evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  expect(phaseColumns.trim().split(/\s+/)).toHaveLength(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeGreaterThan(390);
});

test("Heart of Hopefind skins align and center the survivor style picker", async ({ page }) => {
  await page.goto("/");
  await selectPreset(page, "heart-of-hopefind");

  for (const skinId of ["survivor-notebook"]) {
    const geometry = await page.locator(".style-name-row").evaluate((row) => {
      const freeText = row.querySelector<HTMLElement>('[data-module-id="survivor-style-name"]')!.getBoundingClientRect();
      const buttonElement = row.querySelector<HTMLElement>('[data-module-id="pick-survivor-style"] [data-part="button"]')!;
      const button = buttonElement.getBoundingClientRect();
      const icon = buttonElement.querySelector<SVGElement>("svg")!.getBoundingClientRect();
      const style = getComputedStyle(buttonElement);
      return {
        freeText: { top: freeText.top, height: freeText.height },
        button: { left: button.left, top: button.top, width: button.width, height: button.height },
        icon: { left: icon.left, top: icon.top, width: icon.width, height: icon.height },
        backgroundColor: style.backgroundColor,
        color: style.color,
      };
    });

    expect(Math.abs(geometry.button.top - geometry.freeText.top), skinId).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.button.height - geometry.freeText.height), skinId).toBeLessThanOrEqual(1);
    expect(Math.abs(
      geometry.icon.left + geometry.icon.width / 2 - (geometry.button.left + geometry.button.width / 2),
    ), skinId).toBeLessThanOrEqual(1);
    expect(Math.abs(
      geometry.icon.top + geometry.icon.height / 2 - (geometry.button.top + geometry.button.height / 2),
    ), skinId).toBeLessThanOrEqual(1);

    if (skinId === "survivor-notebook") {
      expect(geometry.backgroundColor).toBe("rgb(48, 46, 40)");
      expect(geometry.color).toBe("rgb(238, 232, 215)");
    }
  }
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

async function selectPreset(page: Page, packageId: string) {
  await page.getByRole("button", { name: "系统包", exact: true }).click();
  await page.getByRole("combobox", { name: "预制系统包" }).selectOption(packageId);
  await expect(page.locator(`[data-system-package-id="${packageId}"]`)).toBeVisible();
}
