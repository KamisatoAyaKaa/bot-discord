const { xemProfile } = require("./profile.js");
const { handleTuLuyen } = require("./tuluyen.js"); // Import file tu luyện mới tạo
const { handleDotPha } = require("./dotpha.js");
const npcManager = require("./npc.js");
const bank = require("../bank.js");
const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
module.exports = {
  handleTuTien: async function (interaction) {
    // 1. Nếu người chơi gõ lệnh gạch chéo /tutien
    // Tìm đến đoạn này trong file tutien/index.js
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "tutien"
    ) {
      // SỬA ĐOẠN NÀY: Thêm { ephemeral: true } vào trong hàm deferReply
      await interaction.deferReply({ ephemeral: true });
      return xemProfile(interaction);
    }

    // 2. Nếu người chơi ấn vào nút bấm Vận Công trên bảng Profile
    if (interaction.isButton() && interaction.customId === "tt_luyen_cong") {
      return handleTuLuyen(interaction); // Chuyển hướng sang file tuluyen.js mới
    }

    // 3. Nếu người chơi ấn vào nút bấm Đột Phá Cảnh Giới
    if (interaction.isButton() && interaction.customId === "tt_dot_pha") {
      return handleDotPha(interaction);
    }
  },
  // Logic khi người chơi gõ lệnh cưới (hoặc tạo nút bấm)
  handleCuoiNPC: async function (interaction) {
    const userId = interaction.user.id;
    const player = await bank.getPlayer(userId);

    // Kiểm tra xem đã có vợ chưa
    if (player.tutien.daoLu && player.tutien.daoLu.hasPartner) {
      return interaction.reply({
        content:
          "⚠️ **Tham lam vô độ!** Đạo hữu đã có một vị Đạo Lữ đồng hành rồi, không thể kết nạp thêm!",
        ephemeral: true,
      });
    }

    // Giả sử người chơi chọn cưới Tuyết Nhi
    const npcSelected = npcManager.DANH_SACH_NPC["tuyet_nhi"];

    if (player.balance < npcSelected.giaCuoi) {
      return interaction.reply({
        content: `❌ **Nghèo túng đường tu!** Đạo hữu cần \`$${npcSelected.giaCuoi.toLocaleString()}\` Linh Thạch để rước **${npcSelected.ten}** làm Đạo Lữ. Bạn hiện chỉ có \`$${player.balance.toLocaleString()}\`.`,
        ephemeral: true,
      });
    }

    // Khấu trừ linh thạch và gán vợ
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
    const thoiGianCho = 2 * 60 * 60 * 1000; // Cooldown 2 tiếng một lần song tu
    const daQua = bayGio - (player.tutien.daoLu.lastSongTu || 0);

    if (daQua < thoiGianCho) {
      const conLai = Math.ceil((thoiGianCho - daQua) / (60 * 1000));
      return interaction.reply({
        content: `⏱️ **Nguyên khí chưa hồi phục!** Đạo hữu và Đạo Lữ cần nghỉ ngơi. Hãy quay lại sau **${conLai} phút** nữa.`,
        ephemeral: true,
      });
    }

    // Lấy thông tin chỉ số buff của vợ
    const npcInfo = npcManager.DANH_SACH_NPC[player.tutien.daoLu.npcId];

    // Tính toán tu vi nhận được (Gốc ngẫu nhiên từ 50-100 nhân với hệ số buff của vợ)
    const tuViGoc = Math.floor(Math.random() * 51) + 50;
    const tuViThucTe = Math.floor(tuViGoc * npcInfo.buffExp);

    // Cộng tu vi và tăng nhẹ điểm thân mật
    player.tutien.tuVi += tuViThucTe;
    player.tutien.daoLu.thanMat += 5;
    player.tutien.daoLu.lastSongTu = bayGio;

    await bank.save();

    return interaction.reply({
      content: `🧘‍♂️ **VẬN CÔNG SONG TU!** Bạn và **${npcInfo.ten}** cùng nhau ngồi xếp bằng, linh lực hòa quyện dòng chảy giao thoa.\n➔ Nhận được **+${tuViThucTe} Tu Vi** (Đã kích hoạt buff x${npcInfo.buffExp} từ Đạo Lữ).\n➔ Điểm thân mật tăng lên: \`${player.tutien.daoLu.thanMat} Pts\`.`,
    });
  },
  handleTroChuyenAI: async function (interaction) {
    const userId = interaction.user.id;
    const player = await bank.getPlayer(userId);

    // 1. Check xem đã có vợ chưa
    if (!player.tutien.daoLu || !player.tutien.daoLu.hasPartner) {
      return interaction.reply({
        content:
          "⚠️ Đạo hữu chưa có Đạo Lữ đồng hành, định truyền âm nhập mật với hư vô sao? Hãy dùng `/cuointc` trước!",
        ephemeral: true,
      });
    }

    // 2. Lấy nội dung người chơi gõ và thông tin vợ
    const tinNhanCuaBan = interaction.options.getString("noi_dung");
    const npcInfo = npcManager.DANH_SACH_NPC[player.tutien.daoLu.npcId];
    const thanMat = player.tutien.daoLu.thanMat;

    // Gọi thông báo đang "suy nghĩ" để tránh bị quá 3s timeout của Discord
    await interaction.deferReply();

    try {
      // 3. Triệu hồi AI và ép nhập vai theo Prompt cá tính
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", // Dòng model siêu tốc, phản hồi dưới 1 giây
        contents: [{ role: "user", parts: [{ text: tinNhanCuaBan }] }],
        config: {
          systemInstruction: npcInfo.promptAI, // Ép AI đóng vai Tiên Nữ
          temperature: 0.7, // Độ sáng tạo vừa phải để giữ đúng tính cách
        },
      });

      const loiTienNu = response.text;

      // 4. Cộng nhẹ 1 điểm thân mật vì đã dành thời gian tâm sự
      player.tutien.daoLu.thanMat += 1;
      await bank.save();

      // 5. Trả về Embed giao diện trò chuyện
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
