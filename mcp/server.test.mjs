import assert from "node:assert/strict";
import test from "node:test";
import { apiBase, apiKey, buildSendBody, callTool, handleMessage } from "./server.mjs";

test("sends the API key only to Postlane", () => {
  assert.equal(apiBase(), "https://www.postlane.email");
  assert.equal(apiBase({ POSTLANE_API_BASE: "https://evil.example" }), "https://www.postlane.email");
});

test("ignores a missing or unsubstituted API key", () => {
  assert.equal(apiKey({ POSTLANE_API_KEY: "" }), "");
  assert.equal(apiKey({ POSTLANE_API_KEY: "${POSTLANE_API_KEY}" }), "");
  assert.equal(apiKey({ POSTLANE_API_KEY: "sk_live_nope" }), "");
  assert.equal(apiKey({ POSTLANE_API_KEY: "pl_live_abc" }), "pl_live_abc");
});

test("builds a send body without empty optional fields", () => {
  assert.deepEqual(
    buildSendBody({
      from: "hello@send.example.com",
      to: ["alex@example.com"],
      template: "Reset your password",
      variables: { first_name: "Alex" },
      reply_to: "help@example.com",
    }),
    {
      from: "hello@send.example.com",
      to: ["alex@example.com"],
      reply_to: "help@example.com",
      template: "Reset your password",
      variables: { first_name: "Alex" },
    },
  );
});

test("send_email posts the live contract", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ id: "em_123", status: "queued" }), { status: 202 });
  };
  const result = await callTool(
    "send_email",
    {
      from: "hello@send.example.com",
      to: "alex@example.com",
      subject: "Welcome",
      html: "<h1>You’re in.</h1>",
      idempotency_key: "welcome-alex",
    },
    { POSTLANE_API_KEY: "pl_live_test" },
    fetchImpl,
  );
  assert.equal(result.isError, false);
  assert.match(result.content[0].text, /em_123/);
  assert.equal(calls[0].url, "https://www.postlane.email/v1/emails");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.Authorization, "Bearer pl_live_test");
  assert.equal(calls[0].init.headers["Idempotency-Key"], "welcome-alex");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    from: "hello@send.example.com",
    to: "alex@example.com",
    subject: "Welcome",
    html: "<h1>You’re in.</h1>",
  });
});

test("refuses a send without an idempotency key", async () => {
  const result = await callTool(
    "send_email",
    { from: "hello@send.example.com", to: "alex@example.com", subject: "Hi", text: "Hi" },
    { POSTLANE_API_KEY: "pl_live_test" },
    async () => {
      throw new Error("network");
    },
  );
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /idempotency_key/);
});

test("lists tools and echoes the protocol version", async () => {
  const init = await handleMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-06-18" },
  });
  assert.equal(init.result.protocolVersion, "2025-06-18");
  assert.equal(init.result.serverInfo.name, "postlane");
  const listed = await handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.deepEqual(
    listed.result.tools.map((tool) => tool.name),
    ["send_email", "get_email", "list_emails"],
  );
  const send = listed.result.tools.find((tool) => tool.name === "send_email");
  assert.equal(send.annotations.title, "Send email");
  assert.equal(send.annotations.readOnlyHint, false);
  assert.equal(send.annotations.destructiveHint, true);
  for (const tool of listed.result.tools.filter((item) => item.name !== "send_email")) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(typeof tool.annotations.title, "string");
  }
  assert.equal(await handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" }), null);
});
