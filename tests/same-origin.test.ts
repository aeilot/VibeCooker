import { test } from "node:test";
import assert from "node:assert/strict";
import { isSameOriginRequest } from "../src/lib/server/same-origin";
import { POST } from "../src/app/api/agent/route";

function request(
  headers: Record<string, string>,
  url = "http://0.0.0.0:3000/api/agent",
) {
  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "test" }),
  });
}

test("本地监听 0.0.0.0 时，localhost 和 IP 的实际 Host 请求都能通过同源检查", async () => {
  for (const host of ["localhost:3000", "127.0.0.1:3000", "[::1]:3000"]) {
    const req = request({
      host,
      origin: `http://${host}`,
      "sec-fetch-site": "same-origin",
    });
    assert.equal(isSameOriginRequest(req), true);
    // No key: passing the origin guard must reach credential validation, not the provider.
    assert.equal((await POST(req)).status, 401);
  }
});

test("拒绝跨站 Origin、不同端口、不同协议及伪造转发头", () => {
  for (const origin of [
    "https://other.example",
    "http://localhost:4000",
    "https://localhost:3000",
    "null",
    "not-an-origin",
  ]) {
    assert.equal(
      isSameOriginRequest(
        request({
          host: "localhost:3000",
          origin,
          "x-forwarded-host": "other.example",
        }),
      ),
      false,
    );
  }
  assert.equal(
    isSameOriginRequest(
      request({
        host: "localhost:3000",
        origin: "http://localhost:3000",
        "sec-fetch-site": "cross-site",
      }),
    ),
    false,
  );
});

test("普通同源 URL 和无 Origin 的非浏览器调用仍可用", () => {
  assert.equal(
    isSameOriginRequest(
      request(
        { origin: "https://cooking.example" },
        "https://cooking.example/api/agent",
      ),
    ),
    true,
  );
  assert.equal(isSameOriginRequest(request({})), true);
});
