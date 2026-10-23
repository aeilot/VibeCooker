import { test, expect } from "@playwright/test";

test("自定义选择支持键盘、取消和外部关闭", async ({ page }) => {
  await page.goto("/");
  const language = page.getByRole("combobox", { name: "Language / 语言" });
  await language.focus();
  await language.press("ArrowDown");
  await language.press("End");
  await language.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(language).toBeFocused();
  await language.press("Space");
  await language.press("Home");
  await language.press("Escape");
  await expect(language).toHaveText("English");
  await expect(language).toHaveAttribute("aria-expanded", "false");
  await language.click();
  await page.locator(".hero h1").click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await language.click();
  await language.press("Tab");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(page.locator(".connection-pill")).toBeFocused();
});

test("中英文下拉文字和箭头不重叠，AI 齿轮始终位于页头最右侧", async ({
  page,
}) => {
  await page.goto("/");
  for (const locale of ["简体中文", "English"]) {
    await page.getByRole("combobox", { name: "Language / 语言" }).click();
    await page.getByRole("option", { name: locale, exact: true }).click();
    for (const width of [320, 390, 768, 850, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const geometry = await page.evaluate(() => {
        const trigger = document.querySelector(
          ".language-switch .select-trigger",
        )!;
        const text = trigger
          .querySelector(".select-value")!
          .getBoundingClientRect();
        const arrow = trigger.querySelector("svg")!.getBoundingClientRect();
        const gear = document
          .querySelector(".connection-pill")!
          .getBoundingClientRect();
        const language = trigger.getBoundingClientRect();
        return {
          textRight: text.right,
          arrowLeft: arrow.left,
          gearX: gear.x,
          gearY: gear.y,
          languageRight: language.right,
          languageY: language.y,
          scroll: document.documentElement.scrollWidth,
        };
      });
      expect(geometry.textRight).toBeLessThan(geometry.arrowLeft);
      expect(geometry.gearX).toBeGreaterThan(geometry.languageRight);
      expect(Math.abs(geometry.gearY - geometry.languageY)).toBeLessThan(5);
      expect(geometry.scroll).toBe(width);
      await page.getByRole("combobox", { name: "Language / 语言" }).click();
      const menu = await page.getByRole("listbox").boundingBox();
      expect(menu!.x).toBeGreaterThanOrEqual(0);
      expect(menu!.x + menu!.width).toBeLessThanOrEqual(width);
      await page.keyboard.press("Escape");
      if (width <= 850) {
        await expect(page.locator(".connection-label")).toBeHidden();
        await expect(page.locator(".connection-gear")).toBeVisible();
      }
    }
  }
});
