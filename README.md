# 🎓 The Professor's Telegram Ticket Bot

A professional Telegram bot built with **Node.js** and **Telegraf** for managing Homework and Development service tickets. It uses a wizard-style flow to collect requirements and forwards them to specific forum topics in an admin group.

## 🚀 Features

- **Dual Ticket Categories**: Separate flows for 📚 Homework Support and 💻 Development Support.
- **Wizard Flow**: Easy-to-use step-by-step process for users to submit details.
- **Forum Integration**: Automatically sends tickets to specific topics (threads) in a Telegram Forum Group.
- **Two-Way Communication**: 
  - Admin replies in the forum thread are automatically forwarded back to the client.
  - Supports text, images, documents, voice notes, videos, and stickers.
- **Ticket ID Tracking**: Each ticket is assigned a unique 4-digit ID (starting from 1000).
- **Announce Command**: Quickly post the service panel to any group.

## 🛠 Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd <repo-folder>
   ```

2. **Install dependencies**:
   ```bash
   npm install telegraf dotenv
   ```

3. **Set up Environment Variables**:
   Create a `.env` file in the root directory and add your bot credentials:
   ```env
   TELEGRAM_TOKEN=your_bot_token_here
   ADMIN_GROUP_ID=-100xxxxxxxxxx
   HOMEWORK_THREAD_ID=123
   DEVELOPMENT_THREAD_ID=456
   ```

## 📖 Usage

- **Start the bot**:
  ```bash
  node telegram_bot.js
  ```
- **User Commands**:
  - `/start`: Opens the service selection panel.
  - `/cancel`: Stops the current ticket wizard.
- **Admin Commands**:
  - `/announce`: Sends the "Create a Ticket" panel to the admin group (or any group where the bot is admin).

## 📁 Technical Details

- **Framework**: `Telegraf.js`
- **State Management**: `Scenes` (WizardScene) for ticket collection.
- **Session**: `telegraf-session-local` (or default session memory).
- **Parsing**: Markdown-ready messages for a clean UI.
