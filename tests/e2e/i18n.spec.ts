import { test, expect } from "@playwright/test";

test("即时切换语言，保留食材与会话 Key，支持英文搜索及刷新恢复", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "西兰花", exact: true }).click();
  await page.getByRole("button", { name: "我的厨房", exact: true }).click();
  await page.getByRole("combobox", { name: "模型提供商", exact: true }).click();
  await page.getByRole("option", { name: "DeepSeek", exact: true }).click();
  await page
    .getByRole("textbox", { name: "API Key", exact: true })
    .fill("fake-locale-test-key");
  await page.getByRole("combobox", { name: "Language / 语言" }).click();
  await page.getByRole("option", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(await page.locator("main").innerText()).not.toMatch(
    /[\u3400-\u9fff]/u,
  );
  await expect(
    page.getByRole("heading", { name: "My kitchen", exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "API Key", exact: true }),
  ).toHaveValue("fake-locale-test-key");
  await page
    .getByRole("button", {
      name: "Remove this key and use demo mode",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Back to the kitchen", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove Broccoli", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search ingredients", exact: true })
    .fill("tomatoes");
  await expect(
    page.getByRole("button", { name: "Tomato", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("combobox", { name: "Language / 语言" }),
  ).toHaveText("English");
  await expect(page).toHaveTitle("VibeCooker · A little love in every meal");
  await expect(
    page.getByRole("button", { name: "Remove Broccoli", exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Language / 语言" }).click();
  await page.getByRole("option", { name: "简体中文", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "移除西兰花", exact: true }),
  ).toBeVisible();
});

test("英文演示料理、科学原理和做饭反馈均可读，手机无横向溢出", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Language / 语言" }).click();
  await page.getByRole("option", { name: "English", exact: true }).click();
  await page
    .getByRole("button", { name: "Find something lovely to cook", exact: true })
    .click();
  await expect(page.locator(".recipe-card")).toHaveCount(6);
  await expect(page.locator(".recipe-card").first()).toContainText(
    "Tomato & Egg",
  );
  await page
    .getByRole("button", { name: "The science & scoring model", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("COMBINATIONS");
  await expect(page.getByRole("dialog")).not.toContainText("科学");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.locator(".recipe-card").first().click();
  await expect(page.getByRole("dialog")).toContainText("Save for another meal");
  await expect(page.getByRole("dialog")).toContainText("Protein denaturation");
  await page
    .getByRole("button", { name: "Let’s cook this one", exact: true })
    .click();
  await page
    .getByRole("button", { name: "The pan looks dry", exact: true })
    .click();
  await expect(page.locator(".feedback-messages")).toContainText(
    "Demo mode records the current state",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test("英文模型请求携带语言，错误就地以英文显示", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Language / 语言" }).click();
  await page.getByRole("option", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: "My kitchen", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Model provider", exact: true })
    .click();
  await page.getByRole("option", { name: "DeepSeek", exact: true }).click();
  await page
    .getByRole("textbox", { name: "API Key", exact: true })
    .fill("fake-i18n-test-key");
  let locale = "";
  await page.route("**/api/agent", (route) => {
    locale = route.request().headers()["x-ui-locale"];
    return route.fulfill({
      status: 502,
      json: { error: "API Key 无效或已失效，请检查提供商和 Key 是否匹配。" },
    });
  });
  await page
    .getByRole("button", { name: "Test connection", exact: true })
    .click();
  await expect(page.locator(".connection-feedback.error")).toContainText(
    "API key is invalid or expired",
  );
  expect(locale).toBe("en");
});
