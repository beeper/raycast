# Beeper Raycast Extension

**This is pretty much work in progress and depends on an unreleased version of Beeper Desktop**

Manage Beeper Desktop with Raycast. Uses the [Beeper Desktop API TypeScript SDK](https://developers.beeper.com/desktop-api-reference/typescript/) with PKCE authentication.

## Commands

- **Recent Chats**: Browse recent chats, open in Beeper Desktop, reply/edit, set reminders, archive, and upload/download attachments.
- **Unread Chats**: Focus on chats with unread messages.
- **Contacts**: Search contacts across connected accounts and start chats.
- **Search Recent Messages**: Search messages across chats with sender/attachment/date filters.
- **Open Beeper**: Bring Beeper to the foreground.

## Prerequisites

Before using this extension, you **must enable the Beeper Desktop API** in your Beeper Desktop settings:

1. Open Beeper Desktop
2. Go to **Settings** (⚙️ icon in the sidebar)
3. Navigate to **Developers** section
4. Find the **Beeper Desktop API** section
5. Click the toggle to enable "Start on launch"
6. The API should now be running on port 23373 (you'll see "Running with MCP on port 23373")

Once enabled, you can use the Raycast extension to interact with your Beeper chats and accounts.

## Setup

See the [Beeper Desktop API Getting Started guide](https://developers.beeper.com/desktop-api/#get-started) for additional setup instructions.
