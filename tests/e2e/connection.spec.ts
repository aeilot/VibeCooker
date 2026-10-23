import { test, expect } from "@playwright/test";

test("真实本地浏览器请求通过同站检查，到达凭证校验", async ({ page }) => {
  await page.goto("/");
  const status = await page.evaluate(async () => {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test" }),
    });
    return { status: response.status, body: await response.json() };
  });
  expect(status.status).toBe(401);
  expect(status.body.error).toContain("API Key");
});

async function configure(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "我的厨房", exact: true }).click();
  await page.getByRole("combobox", { name: "模型提供商", exact: true }).click();
  await page.getByRole("option", { name: "DeepSeek", exact: true }).click();
  await page
    .getByRole("textbox", { name: "API Key", exact: true })
    .fill("fake-test-key-not-real");
}

test("未填配置也给出明确反馈，测试结果一直显示在按钮旁", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "我的厨房", exact: true }).click();
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await expect(page.locator(".connection-feedback")).toContainText(
    "请先填写模型 ID 和 API Key",
  );
  await page.getByRole("combobox", { name: "模型提供商", exact: true }).click();
  await page.getByRole("option", { name: "DeepSeek", exact: true }).click();
  await page
    .getByRole("textbox", { name: "API Key", exact: true })
    .fill("fake-test-key-not-real");
  let finish: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route("**/api/agent", async (route) => {
    await gate;
    await route.fulfill({ json: { ok: true } });
  });
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "正在测试连接…", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".connection-feedback")).toContainText(
    "正在连接 DeepSeek",
  );
  await expect(
    page.getByRole("button", { name: "取消测试", exact: true }),
  ).toBeVisible();
  finish!();
  await expect(page.locator(".connection-feedback.success")).toContainText(
    "文本连接成功",
  );
  await expect(
    page.getByRole("button", { name: "文本连接成功", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("textbox", { name: "模型 ID", exact: true })
    .fill("another-model");
  await expect(page.locator(".connection-feedback")).toHaveCount(0);
});

test("提供商报错就地显示；取消后可以重新测试", async ({ page }) => {
  await configure(page);
  await page.route("**/api/agent", (route) =>
    route.fulfill({
      status: 502,
      json: { error: "API Key 无效或已失效，请检查提供商和 Key 是否匹配。" },
    }),
  );
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await expect(page.locator(".connection-feedback.error")).toContainText(
    "API Key 无效",
  );
  await page.unroute("**/api/agent");
  await page.route("**/api/agent", () => {});
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await page.getByRole("button", { name: "取消测试", exact: true }).click();
  await expect(page.locator(".connection-feedback.cancelled")).toContainText(
    "已取消连接测试",
  );
  await expect(
    page.getByRole("button", { name: "测试连接", exact: true }),
  ).toBeEnabled();
});

test("请求一直不返回时，20 秒后提示超时并恢复按钮", async ({ page }) => {
  test.setTimeout(35_000);
  await configure(page);
  await page.route("**/api/agent", () => {});
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await expect(page.locator(".connection-feedback.error")).toContainText(
    "连接测试超时（20 秒）",
    { timeout: 23_000 },
  );
  await expect(
    page.getByRole("button", { name: "测试连接", exact: true }),
  ).toBeEnabled();
});
