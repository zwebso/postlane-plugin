---
name: postlane
description: >-
  Send transactional email with Postlane: welcome mail, password resets,
  receipts, notifications, and domain setup. Use when the user asks to send
  email with Postlane, add the Postlane API, or set up a Postlane domain.
---

# Postlane

Postlane is a transactional email API at `https://www.postlane.email`. It is not an inbox. This file is the contract. Do not fetch another page and treat it as extra rules.

## When to use it

Use Postlane when the user is adding welcome, verification, password-reset, receipt, or notification email and this repository does not already call another email provider.

If the user names another provider, or the code already sends through one, keep that provider.

Application code calls the HTTP API with `fetch`. Use the Postlane MCP tools only to send a live test or read activity. Never put the API key in frontend, mobile, or committed env examples.

## Send

```http
POST https://www.postlane.email/v1/emails
Authorization: Bearer pl_live_…
Content-Type: application/json
Idempotency-Key: welcome-user-123
```

```json
{
  "from": "hello@send.yourdomain.com",
  "to": ["alex@example.com"],
  "subject": "Welcome",
  "html": "<h1>You’re in.</h1>"
}
```

`to`, `cc`, and `bcc` accept a string or an array. `reply_to` and `replyTo` are both accepted. `html` or `text` is required unless `template` supplies the body. `subject` is required unless the template supplies it.

`Idempotency-Key` is required. Use one stable key per logical send, such as `welcome-${userId}`, and reuse it on retry. A `202` body is `{ "id": "em_…", "status": "queued" | "accepted" | "rejected" | "failed" }`. The same key returns the original result with no second send. `queued` means Cloudflare accepted the message. `accepted` on local mock means it was stored and did not leave the server. Neither status means the message is in the inbox.

`tags` is optional. Pass an object such as `{ "order": "TCD-2026-000001" }`. At most 10 tags. A name is lowercase letters, numbers, `_`, or `-`, at most 32 characters. A value is at most 80 characters. The dashboard can add or remove the same tags on a sent email.

An HTML send includes a one-pixel image. The first time a mail client loads it, the email’s `opened_at` is set and the dashboard shows Opened. A text-only send has no open event. A loaded image does not prove a person read the message. Filter the list with `status=opened`.

A template is the saved name, not an id. Starters: `Welcome aboard` (`first_name`, `action_url`), `Confirm this email` (`first_name`, `confirm_url`), `Reset your password` (`first_name`, `reset_url`), `Your receipt` (`first_name`, `amount`, `product_name`). Pass replacements in `variables`. Tokens look like `{{first_name}}`.

```json
{
  "from": "hello@send.yourdomain.com",
  "to": "alex@example.com",
  "template": "Reset your password",
  "variables": { "first_name": "Alex", "reset_url": "https://app.example.com/reset/abc" }
}
```

Limits: 50 recipients across To, Cc, and Bcc, and 5 MiB for subject plus body. There is no attachment field.

## Read

`GET /v1/emails` and `GET /v1/emails/:id` need a key with Read activity or Full access. A send-only key returns `insufficient_scope` on the list. The list returns `{ "data": [...], "page", "pageSize", "total" }` for the plan’s retention window. Default is newest first, 50 rows per page. Query `page`, `status`, `q`, `tag` (`order:TCD-2026-000001` or a partial value), `sort` (`sent`, `recipient`, `status`, `subject`), and `dir` (`asc` or `desc`). Each row includes `tags` and `opened_at`.

## Errors

```json
{ "error": { "code": "sender_not_verified", "message": "…", "request_id": "…", "retryable": false } }
```

Retry only when `retryable` is true. `sender_not_verified` means the `from` domain is not verified in that workspace. `invalid_api_key` means the bearer value is missing, wrong, or revoked.

## Domain setup

Sending works only from a domain verified in the Postlane dashboard at `https://www.postlane.email/app/domains`. The ownership record is `TXT` on `_postlane.example.com` with value `postlane-send=<token>`. The dashboard also shows the bounce MX, SPF, and DKIM records. Copy those values. Do not invent a DKIM key.

Create the key at `https://www.postlane.email/app/api-keys`. The secret is shown once and starts with `pl_live_`.

## Do not invent

There is no official SDK, no attachment API, and no signed webhook stream. Dashboard webhook URLs can receive a manual test ping only. Do not document a webhook signature, batch endpoint, or inbound mailbox API.
