const bank = require("../bank.js");
const { PHAM_CHAT_LINH_CAN, NGO_TINH, THE_CHAT } = require("./properties.js");

async function handleTuLuyen(interaction) {
  const userId = interaction.user.id;
  const player = await bank.getPlayer(userId);
  const tt = player.tutien; // Sử dụng key tutien đã đồng bộ

  const now = new Date();
  const bayGioTimestamp = now.getTime();
  const THOI_GIAN_HOI_MOT_LUOT = 30 * 60 * 1000; // 30 phút đổi ra mili-giây (1800000 ms)

  // =========================================================
  // ⚔️ BƯỚC 1: TỰ ĐỘNG TÍNH TOÁN VÀ HỒI LƯỢT TU LUYỆN (OFFLINE + ONLINE)
  // =========================================================
  if (!tt.lastUpdateLuot) {
    tt.lastUpdateLuot = bayGioTimestamp;
  }

  const thoiGianDaQua = bayGioTimestamp - tt.lastUpdateLuot;

  if (thoiGianDaQua >= THOI_GIAN_HOI_MOT_LUOT) {
    // Tính toán xem đạo hữu đã tích lũy được bao nhiêu lượt trong thời gian qua
    const soLuotDuocHoi = Math.floor(thoiGianDaQua / THOI_GIAN_HOI_MOT_LUOT);

    if (soLuotDuocHoi > 0) {
      // Cộng lượt vào, tối đa chặn ở mốc 20 lượt
      tt.luotTuLuyen = Math.min(20, (tt.luotTuLuyen || 0) + soLuotDuocHoi);

      // Cập nhật lại mốc thời gian, bù trừ phần mili-giây dư thừa để không bị lệch giờ hồi
      tt.lastUpdateLuot =
        tt.lastUpdateLuot + soLuotDuocHoi * THOI_GIAN_HOI_MOT_LUOT;
    }
  }

  // Nếu số lượt đã đầy khế ước (>= 20), liên tục ghim mốc thời gian hồi bằng thời gian hiện tại
  if (tt.luotTuLuyen >= 20) {
    tt.lastUpdateLuot = bayGioTimestamp;
  }

  // =========================================================
  // ⚠️ BƯỚC 2: KIỂM TRA ĐIỀU KIỆN CÒN LƯỢT TU LUYỆN HAY KHÔNG
  // =========================================================
  if (tt.luotTuLuyen <= 0) {
    // Tính toán chính xác còn bao nhiêu phút giây nữa thì hồi lượt tiếp theo
    const thoiGianConLai =
      tt.lastUpdateLuot + THOI_GIAN_HOI_MOT_LUOT - bayGioTimestamp;
    const soPhutConLai = Math.floor(thoiGianConLai / (60 * 1000));
    const soGiayConLai = Math.ceil((thoiGianConLai % (60 * 1000)) / 1000);

    // Trả lời ẩn (ephemeral) riêng tư để không sinh thêm tin nhắn rác trong kênh chat
    return interaction.reply({
      content: `⚠️ **Cạn kiệt linh lực!** Đạo hữu đã dùng hết số lần vận công tích lũy (\`0/20\`). Hãy tĩnh tọa chờ thêm **${soPhutConLai} phút ${soGiayConLai} giây** để hồi phục 1 lượt linh khí.`,
      ephemeral: true,
    });
  }

  // =========================================================
  // 💎 BƯỚC 3: TIẾN HÀNH TRỪ LƯỢT VÀ TÍNH TU VI (CÔNG THỨC BONUS %)
  // =========================================================
  tt.luotTuLuyen -= 1; // Trừ đi 1 lượt tích lũy

  // Tìm kiếm thông tin thuộc tính thực tế để lấy tỷ lệ % bonus
  const lcObj =
    PHAM_CHAT_LINH_CAN.find((lc) =>
      tt.linhCan.includes(lc.name.split(" ")[1]),
    ) || PHAM_CHAT_LINH_CAN[0];
  const ntObj = NGO_TINH.find((nt) => nt.name === tt.ngoTinh) || NGO_TINH[0];
  const tcObj = THE_CHAT.find((tc) => tc.name === tt.theChat) || THE_CHAT[0];

  // Định nghĩa Tu Vi Gốc (baseSpeed) ngẫu nhiên mỗi lần bấm (Từ 15 đến 25 điểm)
  let baseTuVi = Math.floor(Math.random() * 11) + 15;

  // Tính toán tổng các chỉ số cộng thêm (totalBonus)
  let totalBonus = lcObj.bonusTuVi + ntObj.bonusTuVi + tcObj.bonusTuVi;

  // Áp dụng công thức yêu cầu: finalSpeed = baseSpeed * (1 + totalBonus)
  let tuViNhanDuoc = Math.floor(baseTuVi * Math.max(1 + totalBonus, 0.1));

  // Tiến hành cộng Tu Vi vào nhân vật, lưu vết thời gian và đồng bộ database lên Cloud
  tt.tuVi += tuViNhanDuoc;
  tt.lastLuyenCong = now.toISOString();

  await bank.save(); // Đồng bộ trực tiếp lên Cloud Atlas

  // =========================================================
  // 🚀 BƯỚC 4: VẼ LẠI GIAO DIỆN MỚI, ĐÈ LÊN BẢNG CŨ (CÓ HIỂN THỊ LƯỢT)
  // =========================================================
  const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
  } = require("discord.js");

  const embedProfileMoi = new EmbedBuilder()
    .setColor("#1abc9c")
    .setTitle(`🧘 ĐẠO ĐỒ HỒ SƠ - THỜI KHÔNG TU LUYỆN`)
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: "👤 Tu Sĩ", value: `<@${userId}>`, inline: true },
      {
        name: "⚔️ Cảnh Giới Hiện Tại",
        value: `**${tt.canhGioi} ${tt.tang > 0 ? `- Tầng ${tt.tang}` : ""}**`,
        inline: true,
      },
      { name: "🔮 Linh Căn Thuộc Tính", value: `${tt.linhCan}`, inline: false },
      { name: "🧠 Ngộ Tính Tư Chất", value: `${tt.ngoTinh}`, inline: true },
      { name: "🎲 Khí Vận Định Số", value: `${tt.khiVan}`, inline: true },
      { name: "🧬 Thể Chất Đặc Biệt", value: `${tt.theChat}`, inline: false },
      {
        name: "✨ Tu Vi Tích Lũy",
        value: `\`${tt.tuVi} / ${tt.tuViCanThiet}\` Điểm`,
        inline: true,
      },
      {
        name: "⚡ Linh Lực Tích Lũy",
        value: `\`${tt.luotTuLuyen} / 20\` Lượt`,
        inline: true,
      }, // Cập nhật số lượt thực tế còn lại
      {
        name: "🟡 Linh Thạch Sở Hữu",
        value: `**$${player.balance.toLocaleString()}**`,
        inline: false,
      },
    )
    .setDescription(
      `*✨ Đạo hữu vừa tiêu hao 1 lượt Linh Lực, vận công hấp thu được **+${tuViNhanDuoc} Tu Vi**!*`,
    )
    .setFooter({
      text: "Hãy tích cực vận công xả lượt hoặc chuẩn bị đột phá thiên kiếp",
    });

  const rowButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("tt_luyen_cong")
      .setLabel("🧘 Vận Công Luyện Khí")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("tt_dot_pha")
      .setLabel("⚡ Đột Phá Cảnh Giới")
      .setStyle(ButtonStyle.Danger),
  );

  // Ghi đè trực tiếp lên bảng Embed cũ bằng interaction.update
  return interaction.update({
    embeds: [embedProfileMoi],
    components: [rowButtons],
  });
}

module.exports = { handleTuLuyen };
