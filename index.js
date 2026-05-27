require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");
const bank = require("./bank.js");

// ✨ FIX ĐƯỜNG DẪN: Trỏ chính xác vào thư mục taixiu mới chuyển của bạn
const gameTaiXiu = require("./taixiu/taixiu.js");

const gameTuTien = require("./tutien/index.js"); // Đầu mối Tu Tiên giữ nguyên

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Hãy đảm bảo điền mã Token mới, an toàn của bạn vào đây
const TOKEN = process.env.DISCORD_TOKEN;

client.once("ready", async () => {
  console.log(`Bot đã online! Đăng nhập dưới tên: ${client.user.tag}`);

  // Danh sách đăng ký lệnh gạch chéo lên Discord
  const commands = [
    new SlashCommandBuilder()
      .setName("taixiu")
      .setDescription("Mở bàn cược Tài Xỉu Nêkô - Đếm ngược 30s"),
    new SlashCommandBuilder()
      .setName("daily")
      .setDescription("Điểm danh nhận tiền thưởng tích lũy hàng ngày"),
    new SlashCommandBuilder()
      .setName("vi")
      .setDescription("Kiểm tra số dư tài khoản hiện tại của bạn"),
    new SlashCommandBuilder()
      .setName("addtien")
      .setDescription("⚡ Lệnh Admin: Cộng tiền cho một người chơi bất kỳ")
      .addUserOption((option) =>
        option
          .setName("nguoi_nhan")
          .setDescription("Chọn người bạn muốn buff tiền")
          .setRequired(true),
      )
      .addIntegerOption((option) =>
        option
          .setName("so_tien")
          .setDescription("Nhập số tiền muốn buff")
          .setRequired(true),
      ),

    // Đăng ký lệnh Tu Tiên chính thức với Discord
    new SlashCommandBuilder()
      .setName("tutien")
      .setDescription(
        "🧘 Bước vào con đường tu tiên nghịch thiên cải mệnh, thức tỉnh linh căn",
      ),
  ].map((command) => command.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    console.log(
      "🔄 Đang đồng bộ hóa lệnh gạch chéo (/) lên hệ thống Discord...",
    );
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });
    console.log("✅ Hệ thống lệnh gạch chéo đã sẵn sàng!");
  } catch (error) {
    console.error("❌ Thất bại khi đăng ký lệnh:", error);
  }
});

// Điều phối tương tác trung tâm từ Discord gửi về bot
client.on("interactionCreate", async (interaction) => {
  try {
    // 1. Nhóm lệnh tiền tệ ngân hàng (/daily, /vi, /addtien)
    if (interaction.isChatInputCommand()) {
      if (
        interaction.commandName === "daily" ||
        interaction.commandName === "vi" ||
        interaction.commandName === "addtien"
      ) {
        await bank.handleBankCommands(interaction);
        return;
      }
    }

    // 2. Nhóm tương tác game Tài Xỉu (Vẫn nhận diện mượt mà tại folder taixiu mới)
    if (
      (interaction.isChatInputCommand() &&
        interaction.commandName === "taixiu") ||
      (interaction.isButton() && interaction.customId.startsWith("tx_")) ||
      (interaction.isModalSubmit() &&
        interaction.customId.startsWith("tx_modal_"))
    ) {
      await gameTaiXiu.handleTaiXiu(interaction);
      return;
    }

    // 3. Chuyển tiếp toàn bộ tương tác Tu Tiên sang folder tutien xử lý
    if (
      (interaction.isChatInputCommand() &&
        interaction.commandName === "tutien") ||
      (interaction.isButton() && interaction.customId.startsWith("tt_"))
    ) {
      await gameTuTien.handleTuTien(interaction);
      return;
    }
  } catch (error) {
    console.error("❌ Lỗi xử lý tương tác:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "❌ Có lỗi xảy ra khi xử lý lệnh này!",
          ephemeral: true,
        })
        .catch(() => {});
    }
  }
});

client.login(TOKEN);
