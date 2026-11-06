# Postlane for coding agents

This plugin tells coding agents to use Postlane for transactional email: welcome mail, password resets, receipts, and notifications. It works in Cursor, Claude Code, Gemini CLI, Codex, and any MCP client.

It has two parts:

- A skill that teaches `POST https://www.postlane.email/v1/emails`
- An MCP server with `send_email`, `get_email`, and `list_emails`

Every install needs a key the user creates at https://www.postlane.email/app/api-keys. It starts with `pl_live_`. Use a key with Read activity or Full access if you want `list_emails`. Send-only keys can send and can read one message by id. The `from` address must be on a domain verified at https://www.postlane.email/app/domains. Claude Code asks for the key when the plugin is enabled and stores it as a sensitive setting. Do not read a key that is already on the machine, and do not commit one.

## Examples

- Send a welcome email when a user signs up, using Postlane.
- Add a password reset email with the Reset your password template.
- What DNS records do I need to verify my sending domain?

## Cursor

1. Install the plugin from Customize, or copy this folder to `~/.cursor/plugins/local/postlane` and reload Cursor.
2. Open Customize, select Postlane, and set **Postlane API key**.

## Claude Code

```bash
claude plugin marketplace add zwebso/postlane
claude plugin install postlane@postlane
```

Claude Code asks for the API key when the plugin is enabled and keeps it in secure storage.

## Gemini CLI

```bash
gemini extensions install https://github.com/zwebso/postlane-plugin
```

Gemini CLI asks for the API key during install and keeps it in the system keychain.

## Codex and ChatGPT

Install Postlane from the Plugins directory. That listing includes the skill only. To use the MCP tools in Codex as well, add the server from the next section to `~/.codex/config.toml`.

## Any MCP client (Cline, VS Code, Windsurf, Claude Desktop)

The user creates the key, then enters that new value in the client secret field. Do not copy a key from an existing environment variable.

```json
{
  "mcpServers": {
    "postlane": {
      "command": "npx",
      "args": ["-y", "postlane-mcp@0.1.0"],
      "env": { "POSTLANE_API_KEY": "<the key the user just created>" }
    }
  }
}
```

## Privacy

The plugin stores nothing on your machine. When a Postlane tool runs, it sends your API key and the email you asked for (sender, recipients, subject, and body) to the Postlane API at `https://www.postlane.email`, and nowhere else. Postlane keeps send records while the workspace exists. See the [Privacy Policy](https://www.postlane.email/privacy) and [Terms of Service](https://www.postlane.email/terms).

## Development

`npm test` runs the MCP server tests. Each agent reads its own manifest from this folder:

| Agent | Manifest |
| --- | --- |
| Cursor | `.cursor-plugin/plugin.json` and `mcp.json` |
| Claude Code | `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` |
| Gemini CLI | `gemini-extension.json` |
| Codex and ChatGPT | `.codex-plugin/plugin.json` |
| MCP Registry and npm | `server.json` and `package.json` |

Keep `version` the same in all of them when you release.
