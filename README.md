# Beeper Raycast Extension

**This is pretty much work in progress and depends on an unreleased version of Beeper Desktop**

Manage Beeper Desktop with Raycast. Uses the [Beeper Desktop API TypeScript SDK](https://developers.beeper.com/desktop-api-reference/typescript/) with PKCE authentication.

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

## Available Commands

The extension provides the following commands:

### List Accounts

- **Description**: Display a list of all connected Beeper accounts
- **Usage**: Activate from Raycast and select "List Accounts"

### List Chats

- **Description**: Display a list of all your Beeper chats
- **Usage**: Activate from Raycast and select "List Chats"

### Search Chats

- **Description**: Search through your Beeper chats
- **Usage**: Activate from Raycast and select "Search Chats", then enter search text

### Unread Chats

- **Description**: Display all chats with unread messages
- **Usage**: Activate from Raycast and select "Unread Chats"

### Send Message

- **Description**: Quickly send a message to any chat
- **Usage**: Activate from Raycast and select "Send Message"

### Focus Beeper Desktop

- **Description**: Bring Beeper Desktop to the foreground
- **Usage**: Activate from Raycast and select "Focus Beeper Desktop"

## NPM Commands

The project uses the following npm scripts:

| Command | Description |
|---------|-------------|
| `npm run dev` | Runs the extension in development mode |
| `npm run build` | Compiles the extension for distribution |
| `npm run lint` | Validates code using ESLint |
| `npm run fix-lint` | Automatically fixes linting issues |
| `npm run publish` | Publishes the extension to the Raycast Store |
