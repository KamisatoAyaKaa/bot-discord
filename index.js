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

// =========================================================
// ✨ KÍCH HOẠT CỔNG EXPRESS LÊN TRƯỚC ĐỂ RENDER QUÉT TRÚNG NGAY
// =========================================================
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Thiên Đạo đang vận hành ổn định vạn giới!");
});

// Bắt buộc phải thêm địa chỉ mạng '0.0.0.0' để Render kết nối được từ bên ngoài
app.listen(port, "0.0.0.0", () => {
  console.log(`📡 Cổng mạng đã mở tại port ${port} để đón nhận tín hiệu Ping!`);
});

// =========================================================
// KHỞI TẠO DISCORD CLIENT
// =========================================================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
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

    // ✨ CẬP NHẬT MÔ TẢ: Hướng dẫn rõ ràng cách Cộng (+) và Trừ (-) linh thạch
    new SlashCommandBuilder()
      .setName("addtien")
      .setDescription(
        "⚡ Lệnh Admin: Thay đổi linh thạch (Số dương để cộng, số âm để trừ)",
      )
      .addUserOption((option) =>
        option
          .setName("nguoi_nhan")
          .setDescription("Chọn người bạn muốn tác động túi tiền")
          .setRequired(true),
      )
      .addIntegerOption((option) =>
        option
          .setName("so_tien")
          .setDescription("Nhập số tiền (Ví dụ: 5000 để cộng, -5000 để trừ)")
          .setRequired(true),
      )
      .setDefaultMemberPermissions(0), // ✨ LỚP BẢO MẬT 1: Ẩn lệnh, chỉ hiển thị cho người có quyền Quản trị viên (Admin)

    // Đăng ký lệnh Tu Tiên chính thức với Discord
    new SlashCommandBuilder()
      .setName("tutien")
      .setDescription(
        "🧘 Bước vào con đường tu tiên nghịch thiên cải mệnh, thức tỉnh linh căn",
      ),
    new SlashCommandBuilder()
      .setName("cuointc")
      .setDescription(
        "🎎 Tiêu hao linh thạch, cưới một vị Tiên Nữ về làm Đạo Lữ",
      ),
    new SlashCommandBuilder()
      .setName("songtu")
      .setDescription(
        "🧘‍♂️ Cùng Đạo Lữ vận chuyển chu thiên, gia tăng tốc độ bạt tiến tu vi",
      ),
    new SlashCommandBuilder()
      .setName("trochuyen")
      .setDescription(
        "💬 Truyền âm nhập mật, trò chuyện tự do với vị Đạo Lữ của bạn",
      )
      .addStringOption((option) =>
        option
          .setName("noi_dung")
          .setDescription(
            "Nhập lời bạn muốn nói với nàng (Ví dụ: Nàng đang làm gì đó?)",
          )
          .setRequired(true),
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
      // Tách riêng lệnh kiểm tra thông thường
      if (
        interaction.commandName === "daily" ||
        interaction.commandName === "vi"
      ) {
        await bank.handleBankCommands(interaction);
        return;
      }

      // Kiểm soát chặt chẽ lệnh addtien
      if (interaction.commandName === "addtien") {
        // ✨ LỚP BẢO MẬT 2: Kiểm tra trực tiếp quyền hạn trên server
        if (!interaction.member.permissions.has("Administrator")) {
          await interaction.reply({
            content:
              "❌ **Càn khôn điên đảo!** Đạo hữu không phải Admin, không thể tự ý thay đổi linh thạch của thiên hạ!",
            ephemeral: true, // Chỉ một mình kẻ "vòi tiền" nhìn thấy dòng cảnh báo quê xệ này
          });
          return;
        }

        // Nếu đúng là Tông chủ / Admin tối cao, cho phép kích hoạt
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

    // =========================================================
    // 3. ✨ CẬP NHẬT CHỐT CHẶN: Chuyển tiếp cả 4 lệnh Tu Tiên sang folder xử lý
    // =========================================================
    if (
      (interaction.isChatInputCommand() &&
        (interaction.commandName === "tutien" ||
          interaction.commandName === "cuointc" ||
          interaction.commandName === "songtu" ||
          interaction.commandName === "trochuyen")) || // Thêm 3 con đường dẫn mạch linh lực mới
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
