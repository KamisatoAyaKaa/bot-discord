const { EmbedBuilder } = require("discord.js"); // ✨ FIX LỖI: Thêm import EmbedBuilder bị thiếu
const { xemProfile } = require("./profile.js");
const { handleTuLuyen } = require("./tuluyen.js");
const { handleDotPha } = require("./dotpha.js");
const npcManager = require("./npc.js");
const bank = require("../bank.js");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

module.exports = {
  // Đầu mối trung tâm tiếp nhận toàn bộ tương tác từ file index.js chuyển sang
  handleTuTien: async function (interaction) {
    // ==========================================
    // 🧭 PHÂN LUỒNG ĐIỀU PHỐI CÁC LỆNH GẠCH CHÉO (/)
    // ==========================================
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.commandName;

      if (cmd === "tutien") {
        await interaction.deferReply({ ephemeral: true });
        return xemProfile(interaction);
      }

      // ✨ FIX CHÍNH: Gọi chính xác các hàm xử lý bên dưới khi trúng lệnh tương ứng
      if (cmd === "cuointc") {
        return this.handleCuoiNPC(interaction);
      }

      if (cmd === "songtu") {
        return this.handleSongTu(interaction);
      }

      if (cmd === "trochuyen") {
        return this.handleTroChuyenAI(interaction);
      }
    }

    // ==========================================
    // 🎛️ PHÂN LUỒNG ĐIỀU PHỐI CÁC NÚT BẤM (BUTTON)
    // ==========================================
    if (interaction.isButton()) {
      if (interaction.customId === "tt_luyen_cong") {
        return handleTuLuyen(interaction);
      }

      if (interaction.customId === "tt_dot_pha") {
        return handleDotPha(interaction);
      }
    }
  },

  // Logic khi người chơi gõ lệnh cưới
  handleCuoiNPC: async function (interaction) {
    const userId = interaction.user.id;
    const player = await bank.getPlayer(userId);

    if (player.tutien.daoLu && player.tutien.daoLu.hasPartner) {
      return interaction.reply({
        content:
          "⚠️ **Tham lam vô độ!** Đạo hữu đã có một vị Đạo Lữ đồng hành rồi, không thể kết nạp thêm!",
        ephemeral: true,
      });
    }

    const npcSelected = npcManager.DANH_SACH_NPC["tuyet_nhi"];

    if (player.balance < npcSelected.giaCuoi) {
      return interaction.reply({
        content: `❌ **Nghèo túng đường tu!** Đạo hữu cần \`$${npcSelected.giaCuoi.toLocaleString()}\` Linh Thạch để rước **${npcSelected.ten}** làm Đạo Lữ. Bạn hiện chỉ có \`$${player.balance.toLocaleString()}\`.`,
        ephemeral: true,
      });
    }

    player.balance -= npcSelected.giaCuoi;
    player.tutien.daoLu = {
      hasPartner: true,
      npcId: npcSelected.id,
      thanMat: 10,
      lastSongTu: 0,
    };

    await bank.save();
    return interaction.reply({
      content: `🎉 **THÀNH THÂN ĐẠI CÁT!** Đạo hữu đã tiêu hao **$${npcSelected.giaCuoi.toLocaleString()}** Linh Thạch, chính thức rước **${npcSelected.ten}** (${npcSelected.xuatThan}) về làm Đạo Lữ đồng môn! Từ nay gắn kết vận mệnh, cùng nhau nghịch thiên.`,
    });
  },

  // Logic khi người chơi gõ lệnh song tu
  handleSongTu: async function (interaction) {
    const userId = interaction.user.id;
    const player = await bank.getPlayer(userId);

    if (!player.tutien.daoLu || !player.tutien.daoLu.hasPartner) {
      return interaction.reply({
        content:
          "⚠️ **Cơ hàn cô độc!** Đạo hữu chưa có Đạo Lữ, hãy tích lũy linh thạch cưới một Tiên Nữ về rồi mới có thể song tu!",
        ephemeral: true,
      });
    }

    const bayGio = Date.now();
    const thoiGianCho = 2 * 60 * 60 * 1000;
    const daQua = bayGio - (player.tutien.daoLu.lastSongTu || 0);

    if (daQua < thoiGianCho) {
      const conLai = Math.ceil((thoiGianCho - daQua) / (60 * 1000));
      return interaction.reply({
        content: `⏱️ **Nguyên khí chưa hồi phục!** Đạo hữu và Đạo Lữ cần nghỉ ngơi. Hãy quay lại sau **${conLai} phút** nữa.`,
        ephemeral: true,
      });
    }

    const npcInfo = npcManager.DANH_SACH_NPC[player.tutien.daoLu.npcId];

    const tuViGoc = Math.floor(Math.random() * 51) + 50;
    const tuViThucTe = Math.floor(tuViGoc * npcInfo.buffExp);

    player.tutien.tuVi += tuViThucTe;
    player.tutien.daoLu.thanMat += 5;
    player.tutien.daoLu.lastSongTu = bayGio;

    await bank.save();

    return interaction.reply({
      content: `🧘‍♂️ **VẬN CÔNG SONG TU!** Bạn và **${npcInfo.ten}** cùng nhau ngồi xếp bằng, linh lực hòa quyện dòng chảy giao thoa.\n➔ Nhận được **+${tuViThucTe} Tu Vi** (Đã kích hoạt buff x${npcInfo.buffExp} từ Đạo Lữ).\n➔ Điểm thân mật tăng lên: \`${player.tutien.daoLu.thanMat} Pts\`.`,
    });
  },

  // Logic khi người chơi gõ lệnh trò chuyện AI tự do
  handleTroChuyenAI: async function (interaction) {
    const userId = interaction.user.id;
    const player = await bank.getPlayer(userId);

    if (!player.tutien.daoLu || !player.tutien.daoLu.hasPartner) {
      return interaction.reply({
        content:
          "⚠️ Đạo hữu chưa có Đạo Lữ đồng hành, định truyền âm nhập mật với hư vô sao? Hãy dùng `/cuointc` trước!",
        ephemeral: true,
      });
    }

    const tinNhanCuaBan = interaction.options.getString("noi_dung");
    const npcInfo = npcManager.DANH_SACH_NPC[player.tutien.daoLu.npcId];

    await interaction.deferReply();

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: tinNhanCuaBan }] }],
        config: {
          systemInstruction: npcInfo.promptAI,
          temperature: 0.7,
        },
      });

      const loiTienNu = response.text;

      player.tutien.daoLu.thanMat += 1;
      await bank.save();

      const embedAI = new EmbedBuilder()
        .setColor(
          player.tutien.daoLu.npcId === "tuyet_nhi" ? "#90e0ef" : "#ff5555",
        )
        .setTitle(`🎎 Đạo Lữ Phản Hồi: ${npcInfo.ten}`)
        .addFields(
          { name: `💬 Lời của đạo hữu:`, value: `*\"${tinNhanCuaBan}\"*` },
          { name: `🌸 ${npcInfo.ten} đáp:`, value: `**\"${loiTienNu}\"**` },
        )
        .setFooter({
          text: `📊 Thân mật: ${player.tutien.daoLu.thanMat} Pts | Hệ thống Tiên Nữ AI thần thông`,
        });

      return await interaction.editReply({ embeds: [embedAI] });
    } catch (error) {
      console.error("🔴 Lỗi linh lực AI bị nghẽn:", error);
      return await interaction.editReply({
        content:
          "❌ Pháp trận truyền âm gặp trục trặc, Tiên Nữ đang nhập định, hãy thử lại sau!",
      });
    }
  },
};
