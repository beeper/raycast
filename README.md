# Beeper Raycast Extension

Manage Beeper Desktop with Raycast. Uses the [Beeper Desktop API TypeScript SDK](https://developers.beeper.com/desktop-api-reference/typescript/) with PKCE authentication.

## Commands

- **Recent Chats**: Browse recent chats, open in Beeper Desktop, reply/edit, set reminders, archive, and upload/download attachments.
- **Unread Chats**: Focus on chats with unread messages.
- **Contacts**: Search contacts across connected accounts and start chats.
- **Search Recent Messages**: Search messages across chats with sender/attachment/date filters.
- **Connected Accounts**: View all connected messaging services.
- **Open Beeper**: Bring Beeper to the foreground.

## AI Tools

This extension includes AI tools for natural language actions:

- **Open Chat**: Open chats by fuzzy-matched contact/group name, optionally by service.
- **Send Message**: Send messages with confirmation and contact suggestions.
- **List Accounts**: List all connected messaging services.
- **Search Messages**: Search message content across all chats.
- **Summarize Unread**: Summarize unread activity per chat or across all chats.
- **Summarize Messages**: Summarize recent chat activity with time-range support.

## Preferences

- **Beeper Desktop API Base URL**: Defaults to `http://localhost:23373`.
- **Use Mock Data**: Optional demo mode for screenshots and testing.

## Prerequisites

Before using this extension, you **must enable the Beeper Desktop API** in your Beeper Desktop settings:

1. Open Beeper Desktop
2. Go to **Settings** (⚙️ icon in the sidebar)
3. Navigate to **Developers** section
4. Find the **Beeper Desktop API** section
5. Click the toggle to enable "Start on launch"
6. The API should now be running on port 23373 (you'll see "Running with MCP on port 23373")

Once enabled, you can use the Raycast extension to interact with your Beeper chats and accounts.

## Development

### Targeting the Dev vs GA App

By default, the extension targets the **Beeper Dev** app (using the `beeper-dev://` deep link protocol). To target the **GA (production)** app instead, use the `dev:ga` script:

```bash
# Target the dev app (default)
npm run dev

# Target the GA app
npm run dev:ga
```

This sets the `BEEPER_TARGET=ga` environment variable, which switches the OAuth deep link protocol from `beeper-dev://` to `beeper://`.

### Deep Linking

The extension uses deep links for OAuth authorization and for creating Raycast quicklinks to chats and messages.

**OAuth:** During authentication, the extension opens a `beeper-dev://oauth/authorize` (or `beeper://oauth/authorize` for GA) deep link to trigger the PKCE OAuth flow in Beeper Desktop.

## Setup

See the [Beeper Desktop API Getting Started guide](https://developers.beeper.com/desktop-api/#get-started) for additional setup instructions.
