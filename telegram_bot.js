/**
 * The Professor's Services — Telegram Ticket Bot (Node.js)
 * ==========================================================
 * Discord-style: 2 ticket types — Homework & Development
 * Forum Group: Sends tickets to existing topics
 * Admin Reply: ANY message in ticket thread → forwarded to client
 *
 * INSTALL: npm install telegraf dotenv
 * RUN:     node telegram_bot.js
 *
 * .env file:
 *   TELEGRAM_TOKEN=your_bot_token
 *   ADMIN_GROUP_ID=-1002491762182
 *   HOMEWORK_THREAD_ID=197
 *   DEVELOPMENT_THREAD_ID=576
 */

require("dotenv").config();

const { Telegraf, Scenes, session, Markup } = require("telegraf");

const TOKEN                 = process.env.TELEGRAM_TOKEN;
const ADMIN_GROUP_ID        = process.env.ADMIN_GROUP_ID;
const HOMEWORK_THREAD_ID    = parseInt(process.env.HOMEWORK_THREAD_ID    || "197");
const DEVELOPMENT_THREAD_ID = parseInt(process.env.DEVELOPMENT_THREAD_ID || "576");

let ticketCount = 1000;
function nextId() {
  ticketCount++;
  return String(ticketCount).padStart(4, "0");
}

// ─── THREAD → CLIENT MAP ──────────────────────────────────────────────────────
const threadMap = {};

// ─── MAIN PANEL ───────────────────────────────────────────────────────────────
async function showPanel(ctx) {
  await ctx.reply(
    "🎓 *The Professor's Homework & Development Services*\n\n" +
    "Need help? Select a service below:\n\n" +
    "📚 *Homework Support* — assignments, essays, research\n" +
    "💻 *Development Support* — coding, web dev, scripts",
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("📚 Homework Support",    "open_homework"),
          Markup.button.callback("💻 Development Support", "open_development"),
        ],
      ]),
    }
  );
}

// ─── SEND TICKET TO EXISTING FORUM TOPIC ─────────────────────────────────────
async function sendToForumTopic(bot, tid, type, f1, f2, f3, user) {
  const uname    = user.username ? `@${user.username}` : user.first_name;
  const icon     = type === "homework" ? "📚" : "💻";
  const threadId = type === "homework" ? HOMEWORK_THREAD_ID : DEVELOPMENT_THREAD_ID;

  const labels = type === "homework"
    ? { f1: "Assignment & Subject", f2: "Education Level", f3: "Timeline / Due Date" }
    : { f1: "Project Type",         f2: "Specifications",  f3: "Timeline / Due Date" };

  const sent = await bot.telegram.sendMessage(
    ADMIN_GROUP_ID,
    `🎫 *New Ticket #${tid}*\n` +
    `*Type:* ${icon} ${type === "homework" ? "Homework" : "Development"} Support\n\n` +
    `*${labels.f1}:* ${f1}\n\n` +
    `*${labels.f2}:* ${f2}\n\n` +
    `*${labels.f3}:* ${f3}\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Client:* ${uname} (${user.id})`,
    {
      message_thread_id: threadId,
      parse_mode: "Markdown",
    }
  );

  // Thread mein is client ka entry add karo
  const key = String(threadId);
  if (!threadMap[key]) threadMap[key] = [];
  threadMap[key].push({ userId: user.id, ticketId: tid, type });

  console.log(`✅ ${type} Ticket #${tid} — Sent to thread ${threadId}`);
}

// ─── HOMEWORK WIZARD ──────────────────────────────────────────────────────────
const homeworkWizard = new Scenes.WizardScene(
  "homework-wizard",

  async (ctx) => {
    await ctx.reply(
      "📚 *Homework Support Ticket*\n\n" +
      "Welcome to *The Professor's Homework & Development Services.*\n\n" +
      "Please provide the following details:\n\n" +
      "1️⃣ Assignment & Subject type\n" +
      "2️⃣ Education level _(Highschool, Undergrad, Masters)_\n" +
      "3️⃣ Timeline / Due date\n\n" +
      "━━━━━━━━━━━━━━━━━━━\n\n" +
      "*Example:*\n" +
      "```\n1. Calculus Assignment, Math\n2. Undergrad\n3. Due date: March 20, 2026```\n\n" +
      "👇 Reply with all 3 details in *one message!*",
      { parse_mode: "Markdown" }
    );
    ctx.wizard.state.data = {};
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.message?.text) return;
    const lines = ctx.message.text.split("\n").map(l => l.trim()).filter(Boolean);
    let f1 = null, f2 = null, f3 = null;
    for (const line of lines) {
      if      (/^1[.)]/i.test(line)) f1 = line.replace(/^1[.)]\s*/i, "");
      else if (/^2[.)]/i.test(line)) f2 = line.replace(/^2[.)]\s*/i, "");
      else if (/^3[.)]/i.test(line)) f3 = line.replace(/^3[.)]\s*/i, "");
    }
    if (!f1 && !f2 && !f3 && lines.length >= 3) [f1, f2, f3] = lines;
    if (!f1 || !f2 || !f3) {
      await ctx.reply(
        "❌ Please provide *all 3 details* in one message:\n\n" +
        "```\n1. Assignment & Subject\n2. Education Level\n3. Timeline / Due Date```",
        { parse_mode: "Markdown" }
      );
      return;
    }
    ctx.wizard.state.data = { f1, f2, f3 };
    await ctx.reply(
      "✅ *Please review your ticket:*\n\n" +
      `*1. Assignment & Subject:* ${f1}\n\n` +
      `*2. Education Level:* ${f2}\n\n` +
      `*3. Timeline / Due Date:* ${f3}\n\n` +
      "Is everything correct?",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("✅ Confirm & Submit", "hw_confirm"),
            Markup.button.callback("✏️ Start Over",       "hw_restart"),
          ],
        ]),
      }
    );
    return ctx.wizard.next();
  },

  async (ctx) => {}
);

homeworkWizard.action("hw_confirm", async (ctx) => {
  await ctx.answerCbQuery();
  const { f1, f2, f3 } = ctx.wizard.state.data;
  const tid  = nextId();
  const user = ctx.from;

  await ctx.editMessageText(
    `🎫 *Ticket Created Successfully!*\n\n` +
    `*Ticket ID:* #${tid}\n` +
    `*Type:* 📚 Homework Support\n\n` +
    `*1. Assignment & Subject:* ${f1}\n` +
    `*2. Education Level:* ${f2}\n` +
    `*3. Timeline / Due Date:* ${f3}\n\n` +
    "━━━━━━━━━━━━━━━━━━━\n" +
    "Our team has been notified and will contact you here shortly.\n" +
    "⏱ Typical response: within 24 hours.",
    { parse_mode: "Markdown" }
  );

  try {
    await sendToForumTopic(ctx, tid, "homework", f1, f2, f3, user);
  } catch (err) {
    console.error("❌ Forum topic error:", err.message);
  }

  await ctx.scene.leave();
  await showPanel(ctx);
});

homeworkWizard.action("hw_restart", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "No problem! Let's start over.\n\n" +
    "Please provide all 3 details in one message:\n\n" +
    "```\n1. Assignment & Subject\n2. Education Level\n3. Timeline / Due Date```",
    { parse_mode: "Markdown" }
  );
  ctx.wizard.state.data = {};
  ctx.wizard.selectStep(1);
});

// ─── DEVELOPMENT WIZARD ───────────────────────────────────────────────────────
const developmentWizard = new Scenes.WizardScene(
  "development-wizard",

  async (ctx) => {
    await ctx.reply(
      "💻 *Development Support Ticket*\n\n" +
      "Welcome to *The Professor's Homework & Development Services.*\n\n" +
      "Please provide the following details:\n\n" +
      "1️⃣ Project type & description\n" +
      "2️⃣ Specifications & requirements\n" +
      "3️⃣ Timeline / Deadline\n\n" +
      "━━━━━━━━━━━━━━━━━━━\n\n" +
      "*Example:*\n" +
      "```\n1. Python Flask web app\n2. Login system, REST API, SQLite\n3. Due date: March 20, 2026```\n\n" +
      "👇 Reply with all 3 details in *one message!*",
      { parse_mode: "Markdown" }
    );
    ctx.wizard.state.data = {};
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.message?.text) return;
    const lines = ctx.message.text.split("\n").map(l => l.trim()).filter(Boolean);
    let f1 = null, f2 = null, f3 = null;
    for (const line of lines) {
      if      (/^1[.)]/i.test(line)) f1 = line.replace(/^1[.)]\s*/i, "");
      else if (/^2[.)]/i.test(line)) f2 = line.replace(/^2[.)]\s*/i, "");
      else if (/^3[.)]/i.test(line)) f3 = line.replace(/^3[.)]\s*/i, "");
    }
    if (!f1 && !f2 && !f3 && lines.length >= 3) [f1, f2, f3] = lines;
    if (!f1 || !f2 || !f3) {
      await ctx.reply(
        "❌ Please provide *all 3 details* in one message:\n\n" +
        "```\n1. Project Type\n2. Specifications\n3. Timeline / Due Date```",
        { parse_mode: "Markdown" }
      );
      return;
    }
    ctx.wizard.state.data = { f1, f2, f3 };
    await ctx.reply(
      "✅ *Please review your ticket:*\n\n" +
      `*1. Project Type:* ${f1}\n\n` +
      `*2. Specifications:* ${f2}\n\n` +
      `*3. Timeline / Due Date:* ${f3}\n\n` +
      "Is everything correct?",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("✅ Confirm & Submit", "dev_confirm"),
            Markup.button.callback("✏️ Start Over",       "dev_restart"),
          ],
        ]),
      }
    );
    return ctx.wizard.next();
  },

  async (ctx) => {}
);

developmentWizard.action("dev_confirm", async (ctx) => {
  await ctx.answerCbQuery();
  const { f1, f2, f3 } = ctx.wizard.state.data;
  const tid  = nextId();
  const user = ctx.from;

  await ctx.editMessageText(
    `🎫 *Ticket Created Successfully!*\n\n` +
    `*Ticket ID:* #${tid}\n` +
    `*Type:* 💻 Development Support\n\n` +
    `*1. Project Type:* ${f1}\n` +
    `*2. Specifications:* ${f2}\n` +
    `*3. Timeline / Due Date:* ${f3}\n\n` +
    "━━━━━━━━━━━━━━━━━━━\n" +
    "Our team has been notified and will contact you here shortly.\n" +
    "⏱ Typical response: within 24 hours.",
    { parse_mode: "Markdown" }
  );

  try {
    await sendToForumTopic(ctx, tid, "development", f1, f2, f3, user);
  } catch (err) {
    console.error("❌ Forum topic error:", err.message);
  }

  await ctx.scene.leave();
  await showPanel(ctx);
});

developmentWizard.action("dev_restart", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "No problem! Let's start over.\n\n" +
    "Please provide all 3 details in one message:\n\n" +
    "```\n1. Project Type\n2. Specifications\n3. Timeline / Due Date```",
    { parse_mode: "Markdown" }
  );
  ctx.wizard.state.data = {};
  ctx.wizard.selectStep(1);
});

// ─── BOT SETUP ────────────────────────────────────────────────────────────────
const stage = new Scenes.Stage([homeworkWizard, developmentWizard]);
const bot   = new Telegraf(TOKEN);

bot.use(session());
bot.use(stage.middleware());

bot.start(async (ctx) => {
  await showPanel(ctx);
});

bot.action("open_homework", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  return ctx.scene.enter("homework-wizard");
});

bot.action("open_development", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  return ctx.scene.enter("development-wizard");
});

bot.command("cancel", async (ctx) => {
  await ctx.scene.leave();
  await ctx.reply("Cancelled. Type /start to begin again.");
});

// ─── ADMIN MESSAGE → CLIENT FORWARD ──────────────────────────────────────────
bot.on("message", async (ctx) => {
  try {
    const msg = ctx.message;

    // Sirf admin group
    if (!msg || String(msg.chat.id) !== String(ADMIN_GROUP_ID)) return;

    // Sirf forum threads
    if (!msg.message_thread_id) return;

    // Bot ki apni messages ignore
    if (msg.from?.is_bot) return;

    const threadId = String(msg.message_thread_id);
    const clients  = threadMap[threadId];
    if (!clients || clients.length === 0) return;

    const adminName = msg.from?.first_name || "Support Team";

    for (const ticket of clients) {
      const icon   = ticket.type === "homework" ? "📚" : "💻";
      const header = `💬 *Reply from Support Team*\n*Ticket #${ticket.ticketId}* ${icon}\n\n`;
      const footer = `\n\n━━━━━━━━━━━━━━━━━━━\n_— ${adminName}_`;

      try {
        if (msg.text) {
          await bot.telegram.sendMessage(
            ticket.userId,
            header + msg.text + footer,
            { parse_mode: "Markdown" }
          );
        } else if (msg.photo) {
          const photo = msg.photo[msg.photo.length - 1];
          await bot.telegram.sendPhoto(ticket.userId, photo.file_id, {
            caption: header + (msg.caption || "") + footer,
            parse_mode: "Markdown",
          });
        } else if (msg.document) {
          await bot.telegram.sendDocument(ticket.userId, msg.document.file_id, {
            caption: header + (msg.caption || "") + footer,
            parse_mode: "Markdown",
          });
        } else if (msg.voice) {
          await bot.telegram.sendVoice(ticket.userId, msg.voice.file_id, {
            caption: header + (msg.caption || "") + footer,
            parse_mode: "Markdown",
          });
        } else if (msg.video) {
          await bot.telegram.sendVideo(ticket.userId, msg.video.file_id, {
            caption: header + (msg.caption || "") + footer,
            parse_mode: "Markdown",
          });
        } else if (msg.sticker) {
          await bot.telegram.sendMessage(
            ticket.userId,
            header + "(Sticker)" + footer,
            { parse_mode: "Markdown" }
          );
          await bot.telegram.sendSticker(ticket.userId, msg.sticker.file_id);
        }

        console.log(`📨 Forwarded to User ${ticket.userId} — Ticket #${ticket.ticketId}`);
      } catch (sendErr) {
        console.error(`❌ Could not forward to ${ticket.userId}:`, sendErr.message);
      }
    }

  } catch (err) {
    console.error("❌ Forward handler error:", err.message);
  }
});

// /announce — send panel message to group
bot.command("announce", async (ctx) => {
  try {
    await ctx.telegram.sendMessage(
      ADMIN_GROUP_ID,
      "🎓 *The Professor's Services*\n\n" +
      "Need help? Open a ticket below 👇\n\n" +
      "📚 *Homework Support* — assignments, essays, research\n" +
      "💻 *Development Support* — coding, web dev, scripts\n\n" +
      "🎫 [Create a Ticket](https://t.me/ProfessorServicesBot?start=1)",
      { parse_mode: "Markdown" }
    );
    await ctx.reply("✅ Announcement sent!");
  } catch (err) {
    await ctx.reply("❌ Error: " + err.message);
  }
});

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
bot.catch((err, ctx) => {
  console.error("Bot error:", err.message);
});

// ─── LAUNCH ───────────────────────────────────────────────────────────────────
bot.launch()
  .then(() => console.log("✅ Telegram Bot Online..."))
  .catch((err) => console.error("❌ Launch error:", err));

process.once("SIGINT",  () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
