import { test, expect } from "@playwright/test";

test("扩充食材可分类浏览、展开，支持别名搜索和手机搜索", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".ingredient-tile")).toHaveCount(24);
  await page.getByRole("button", { name: /展开更多/ }).click();
  await expect(page.locator(".ingredient-tile")).toHaveCount(48);
  await page.getByRole("button", { name: "收起食材", exact: true }).click();
  await expect(page.locator(".ingredient-tile")).toHaveCount(24);
  await page.getByRole("button", { name: "海鲜", exact: true }).click();
  await page.getByRole("button", { name: "鱿鱼", exact: true }).click();
  await page.getByRole("button", { name: "豆制品", exact: true }).click();
  await page.getByRole("button", { name: "鹰嘴豆", exact: true }).click();
  await expect(page.getByRole("button", { name: "移除鱿鱼" })).toBeVisible();
  await expect(page.getByRole("button", { name: "移除鹰嘴豆" })).toBeVisible();
  await page
    .getByRole("textbox", { name: "搜索食材", exact: true })
    .fill("西红柿");
  await expect(page.locator(".ingredient-tile")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "番茄", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("textbox", { name: "搜索食材", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "搜索食材", exact: true })
    .fill("马铃薯");
  await expect(
    page.getByRole("button", { name: "土豆", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page
    .getByRole("textbox", { name: "搜索食材", exact: true })
    .fill("金针菇");
  await page.getByRole("button", { name: "金针菇", exact: true }).click();
  await expect(page.getByRole("button", { name: "移除金针菇" })).toBeVisible();
});

test("旧提供商设置平滑迁移；切换 DeepSeek 预填模型并清除旧 Key", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "移除番茄" }).waitFor();
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("vibecooker.kitchen.v1")!);
    saved.provider = "google";
    saved.model = "legacy-model";
    saved.selected = ["南瓜"];
    localStorage.setItem("vibecooker.kitchen.v1", JSON.stringify(saved));
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "移除南瓜" })).toBeVisible();
  await page.getByRole("button", { name: "我的厨房", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "模型提供商", exact: true }),
  ).toHaveText("OpenRouter");
  await expect(
    page.getByRole("textbox", { name: "模型 ID", exact: true }),
  ).toHaveValue("");
  await page.getByRole("combobox", { name: "模型提供商", exact: true }).click();
  await page.getByRole("option", { name: "DeepSeek", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "模型 ID", exact: true }),
  ).toHaveValue("deepseek-flash");
  await page
    .getByRole("textbox", { name: "API Key", exact: true })
    .fill("fake-deepseek-key");
  await page.getByRole("combobox", { name: "模型提供商", exact: true }).click();
  await page.getByRole("option", { name: "OpenRouter", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "API Key", exact: true }),
  ).toHaveValue("");
});

test("完整演示：食材 → 创作 → 做饭反馈 → 刷新恢复 → 料理本与记忆", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "西兰花", exact: true }).click();
  await page.getByRole("textbox", { name: "自定义食材" }).fill("玉米、南瓜");
  await page.getByRole("button", { name: "添加", exact: true }).click();
  await expect(page.getByRole("button", { name: "移除玉米" })).toBeVisible();
  await page.getByRole("switch", { name: "允许原创料理" }).click();
  await page.getByRole("button", { name: "帮我想想，今天吃什么" }).click();
  await expect(page.locator(".recipe-card")).toHaveCount(6);
  await page.locator(".recipe-card").first().click();
  await expect(page.getByRole("dialog")).toContainText("固定演示模板");
  await page.getByRole("button", { name: "就做这道，开始吧" }).click();
  await page.getByRole("button", { name: "这一步完成了" }).click();
  await page.getByRole("button", { name: "锅里有点干", exact: true }).click();
  await expect(page.locator(".feedback-messages")).toContainText(
    "演示模式已记录当前状态",
  );
  await page.getByRole("button", { name: "开始计时", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /继续做饭/ }).click();
  await expect(page.locator(".progress-label")).toContainText("1 / 3");
  await expect(page.getByRole("button", { name: "停止计时" })).toBeVisible();
  await expect(page.locator(".feedback-messages")).toContainText("锅里有点干");
  await page.getByRole("button", { name: "这一步完成了" }).click();
  await page.getByRole("button", { name: "这一步完成了" }).click();
  await page
    .getByRole("textbox", { name: "想记下的小感受" })
    .fill("我平时喜欢清淡一点。");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "收进我的料理本" }).click();
  await expect(page.locator(".history-card")).toHaveCount(1);
  await page.getByRole("button", { name: "我的厨房", exact: true }).click();
  await expect(page.locator(".memory-list")).toContainText(
    "我平时喜欢清淡一点。",
  );
  await page
    .getByRole("button", { name: "删除偏好：我平时喜欢清淡一点。" })
    .click();
  await expect(page.locator(".memory-empty")).toBeVisible();
});

test("照片模型响应需确认；BYOK Key 不持久化，刷新后清除", async ({ page }) => {
  await page.goto("/");
  const image = await page.locator(".hero-illustration").screenshot();
  await page.getByRole("button", { name: "我的厨房", exact: true }).click();
  const fakeKey = "test-vibecooker-key-not-real";
  await page
    .getByRole("textbox", { name: "模型 ID", exact: true })
    .fill("test-vision-model");
  await page
    .getByRole("textbox", { name: "API Key", exact: true })
    .fill(fakeKey);
  let photoSent = false;
  await page.route("**/api/agent", async (route) => {
    const input = route.request().postDataJSON();
    expect(route.request().headers()["x-ai-provider"]).toBe("openrouter");
    expect(route.request().headers()["authorization"]).toBe(
      `Bearer ${fakeKey}`,
    );
    if (input.action === "photo") {
      photoSent = input.data.image.startsWith("data:image/jpeg;base64,");
      await route.fulfill({
        json: {
          ingredients: [
            { name: "番茄", confidence: "较确定" },
            { name: "茄子", confidence: "需确认" },
          ],
          note: "测试响应，仅验证照片确认流程。",
        },
      });
    } else await route.fulfill({ json: { ok: true } });
  });
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "文本连接成功", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "回到小厨房", exact: true }).click();
  await page.getByRole("button", { name: /拍照识别/ }).click();
  await page.locator("input[type=file]").first().setInputFiles({
    name: "test-food.png",
    mimeType: "image/png",
    buffer: image,
  });
  await page
    .getByRole("button", { name: "识别照片里的食材", exact: true })
    .click();
  const uncertain = page.getByRole("button", { name: "茄子 需确认" });
  await expect(uncertain).toHaveAttribute("aria-pressed", "false");
  await uncertain.click();
  await page.getByRole("button", { name: /确认并加入冰箱/ }).click();
  await expect(
    page.getByRole("button", { name: "移除茄子", exact: true }),
  ).toBeVisible();
  expect(photoSent).toBe(true);
  expect(
    await page.evaluate(() => localStorage.getItem("vibecooker.kitchen.v1")),
  ).not.toContain(fakeKey);
  await page.reload();
  await page.getByRole("button", { name: "我的厨房", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "API Key", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("textbox", { name: "模型 ID", exact: true }),
  ).toHaveValue("test-vision-model");
});

test("手机布局无横向溢出；空食材和模型错误可恢复", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByRole("button", { name: "清空", exact: true }).click();
  await page.getByRole("button", { name: "帮我想想，今天吃什么" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "先选几样" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "番茄", exact: true }).click();
  await page.getByRole("button", { name: "我的厨房", exact: true }).click();
  await page
    .getByRole("textbox", { name: "模型 ID", exact: true })
    .fill("test-model");
  await page
    .getByRole("textbox", { name: "API Key", exact: true })
    .fill("fake-test-key-only");
  await page.route("**/api/agent", (route) =>
    route.fulfill({
      status: 502,
      json: { error: "模型暂时不可用，原有进度已保留。" },
    }),
  );
  await page.getByRole("button", { name: "回到小厨房", exact: true }).click();
  await page.getByRole("button", { name: "帮我想想，今天吃什么" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "模型暂时不可用" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "帮我想想，今天吃什么" }),
  ).toBeEnabled();
  await expect(page.getByRole("button", { name: "移除番茄" })).toBeVisible();
});
