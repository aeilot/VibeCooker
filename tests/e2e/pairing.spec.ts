import { test, expect } from "@playwright/test";

test("生成 6/9 个子集选项，展示可复算评分和有来源的原理", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "科学原理与计算模型" }).click();
  await expect(page.getByRole("dialog")).toContainText(/7\s*个理论子集/);
  await expect(page.getByRole("dialog")).toContainText("0.45A");
  await expect(page.getByRole("dialog")).toContainText("尚未接入该图谱");
  await page.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await page.getByRole("button", { name: "帮我想想，今天吃什么" }).click();
  await expect(page.locator(".recipe-card")).toHaveCount(6);
  const snapshot = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("vibecooker.kitchen.v1")!);
    return {
      ingredients: data.recipes.map(
        (r: { ingredients: { name: string }[] }) => r.ingredients.length,
      ),
      minutes: data.pairingContext.profile.minutes,
    };
  });
  expect(snapshot.ingredients.every((n: number) => n < 3)).toBe(true);
  const score = await page
    .locator(".pairing-preview strong")
    .first()
    .innerText();
  await page.getByRole("slider", { name: "可以花多久" }).focus();
  await page.getByRole("slider", { name: "可以花多久" }).press("Home");
  await expect(page.locator(".pairing-preview strong").first()).toHaveText(
    score,
  );
  await page.locator(".recipe-card").first().click();
  await expect(page.getByRole("dialog")).toContainText("留给下次");
  await page.locator(".science-calculation summary").click();
  await expect(page.locator(".score-breakdown")).toContainText("食材齐备率 A");
  await expect(page.locator(".chemistry-note a").first()).toHaveAttribute(
    "href",
    /^https:\/\//,
  );
  await page.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await page.getByRole("button", { name: "9 份", exact: true }).click();
  await page.getByRole("button", { name: "帮我想想，今天吃什么" }).click();
  await expect(page.locator(".recipe-card")).toHaveCount(9);
  await page.reload();
  await expect(page.locator(".recipe-card")).toHaveCount(9);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});
