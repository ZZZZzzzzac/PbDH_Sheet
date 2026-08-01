import { expect, test } from "@playwright/test";

test("Card Tables taller than one A4 page expand in long screenshot mode instead of truncating", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-system-package-id="daggerheart-core"]')).toBeVisible();

  for (let i = 0; i < 15; i += 1) {
    await page.getByRole("button", { name: "选择领域卡", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "领域卡资源库" });
    await expect(dialog).toBeVisible();
    await dialog.locator("tbody tr").first().click();
    await expect(dialog).toBeHidden();
  }
  await expect(page.locator(".daggerheart-card-pane .play-card")).toHaveCount(15);

  await page.getByRole("button", { name: "导入导出", exact: true }).click();
  await page.getByRole("button", { name: "进入长截图模式" }).click();
  await expect(page.locator(".app-shell")).toHaveClass(/long-screenshot-mode/);

  const validationReport = page.getByRole("dialog", { name: "Validation Report" });
  if (await validationReport.count()) {
    await validationReport.getByRole("button", { name: "继续输出" }).click();
  }
  await expect(page.locator(".app-shell")).toHaveClass(/long-screenshot-mode/);

  const a4HeightPx = (297 / 25.4) * 96;
  await expect.poll(() => page.locator(".daggerheart-card-pane").evaluate((pane) => pane.getBoundingClientRect().height)).toBeGreaterThan(a4HeightPx * 1.5);

  const metrics = await page.locator(".daggerheart-card-pane").evaluate((pane) => {
    const paneRect = pane.getBoundingClientRect();
    const cards = [...pane.querySelectorAll<HTMLElement>(".play-card")].map((card) => card.getBoundingClientRect());
    return {
      paneHeight: paneRect.height,
      paneBottom: paneRect.bottom,
      cardsBeyondBottom: cards.filter((rect) => rect.bottom > paneRect.bottom + 0.5).length,
      lastCardBottom: Math.max(...cards.map((rect) => rect.bottom)),
    };
  });
  expect(metrics.cardsBeyondBottom).toBe(0);
  expect(metrics.lastCardBottom).toBeLessThanOrEqual(metrics.paneBottom + 0.5);
});
