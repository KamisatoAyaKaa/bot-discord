const bank = require("../bank.js");
const { DANH_SACH_LINH_CAN } = require("./profile.js");

// Danh sách 11 Đại Cảnh Giới đồng bộ 100%
const CAC_CANH_GIOI = [
  "Phàm Nhân", // Cấp 1
  "Luyện Khí", // Cấp 2
  "Trúc Cơ", // Cấp 3
  "Kim Đan", // Cấp 4
  "Nguyên Anh", // Cấp 5
  "Hóa Thần", // Cấp 6
  "Luyện Hư", // Cấp 7
  "Hợp Thể", // Cấp 8
  "Đại Thừa", // Cấp 9
  "Độ Kiếp", // Cấp 10
  "Chân Tiên", // Cấp 11
];

async function handleDotPha(interaction) {
  const userId = interaction.user.id;
  const player = await bank.getPlayer(userId);
  const tt = player.tutien;

  // 1. Kiểm tra điều kiện Tu Vi ban đầu
  if (tt.tuVi < tt.tuViCanThiet) {
    return interaction.reply({
      content: `❌ **Cơ duyên chưa đủ!** Đạo hữu hiện mới tích lũy được \`${tt.tuVi} / ${tt.tuViCanThiet}\` Tu Vi. Hãy chịu khó vận công hấp thu linh khí thêm!`,
      ephemeral: true,
    });
  }

  // Đặc cách cho Phàm Nhân: Lần đầu đột phá nhảy thẳng lên Luyện Khí Tầng 1 với tỉ lệ 100%
  if (tt.canhGioi === "Phàm Nhân") {
    tt.canhGioi = "Luyện Khí";
    tt.tang = 1;
    tt.tuVi = 0; // Phàm Nhân đặc cách reset về 0 hoàn toàn
    tt.tuViCanThiet = 150;
    await bank.save();
    return interaction.reply(
      `✨ **THỨC TỈNH ĐẠO CĂN!** Đạo hữu <@${userId}> đã thoát thai hoán cốt, chính thức bước vào cảnh giới **Luyện Khí - Tầng 1**, mở ra con đường tu chân nghịch thiên! 🎉`,
    );
  }

  // 2. Tính toán tỉ lệ thành công dựa trên số Tầng hiện tại
  let tyLeGoc = 80; // Tầng 1 -> 3
  if (tt.tang >= 4 && tt.tang <= 6) tyLeGoc = 55; // Tầng 4 -> 6
  if (tt.tang >= 7) tyLeGoc = 35; // Tầng 7 -> 9

  // Bonus tỉ lệ may mắn từ phẩm chất Linh Căn đã bốc quẻ
  let bonusLinhCan = 0;
  if (tt.linhCan.includes("Chân")) bonusLinhCan = 5;
  if (tt.linhCan.includes("Biến Dị")) bonusLinhCan = 12;
  if (tt.linhCan.includes("Thiên")) bonusLinhCan = 25;

  const tyLeTong = Math.min(tyLeGoc + bonusLinhCan, 95); // Tối đa 95% thành công
  const xucXac = Math.random() * 100;

  // =========================================================
  // 3. XỬ LÝ KẾT QUẢ LÔI KIẾP ĐỘT PHÁ
  // =========================================================
  if (xucXac <= tyLeTong) {
    // 🎉 THÀNH CÔNG 🎉

    // ✨ BƯỚC SỬA ĐỔI CHÍ CHÍNH: Khấu trừ tu vi tối thiểu, GIỮ LẠI PHẦN DƯ của người chơi
    const tuViTieuHao = tt.tuViCanThiet;
    tt.tuVi = Math.max(0, tt.tuVi - tuViTieuHao);

    if (tt.tang < 9) {
      // A. Tăng tầng nhỏ (Ví dụ: Tầng 1 -> Tầng 2)
      tt.tang += 1;

      // Độ khó tăng dần theo tầng: Nhân 1.4 lần mốc cũ
      tt.tuViCanThiet = Math.floor(tuViTieuHao * 1.4);

      await bank.save();
      return interaction.reply(
        `⚡ **LINH KHÍ XUNG THIÊN!** Đạo hữu <@${userId}> đột phá thành công, thăng tiến lên **${tt.canhGioi} - Tầng ${tt.tang}**! Đan điền mở rộng! 🎉`,
      );
    } else {
      // B. Lên Đại Cảnh Giới mới khi đang ở Tầng 9 (Ví dụ: Luyện Khí Tầng 9 -> Trúc Cơ Tầng 1)
      const indexHienTai = CAC_CANH_GIOI.indexOf(tt.canhGioi);

      if (indexHienTai < CAC_CANH_GIOI.length - 1) {
        const canhGioiMoi = CAC_CANH_GIOI[indexHienTai + 1];
        tt.canhGioi = canhGioiMoi;
        tt.tang = 1;

        // Công thức tính Tu Vi cần thiết cho Đại cảnh giới mới
        tt.tuViCanThiet = (indexHienTai + 2) * 400;

        await bank.save();
        return interaction.reply(
          `🌌 **KHOẢNG KHÔNG CHẤN ĐỘNG - PHI THĂNG THÀNH CÔNG!** Chúc mừng đại năng <@${userId}> đã vượt qua cửu thiên lôi phạt, tiến vào đại cảnh giới mới: ✨ **${tt.canhGioi} - Tầng 1**! ✨`,
        );
      } else {
        // Đạt đỉnh Chân Tiên Tầng 9 (Trả lại lượng tu vi vừa trừ oan vì đã kịch trần)
        tt.tuVi += tuViTieuHao;
        return interaction.reply({
          content: `👑 **ĐỘC CÔ CẦU BẠI!** Đạo hữu đã đạt tới cảnh giới tối cao **Chân Tiên - Tầng 9**, đứng đầu vạn giới, thọ ngang trời đất!`,
          ephemeral: true,
        });
      }
    }
  } else {
    // ❌ THẤT BẠI ❌ (Tẩu hỏa nhập ma)
    // ✨ BƯỚC SỬA ĐỔI: Phạt trừ 25% tu vi dựa trên mốc tu vi HIỆN TẠI mà họ tích lũy được
    const tuViTonThat = Math.floor(tt.tuVi * 0.25);
    tt.tuVi = Math.max(0, tt.tuVi - tuViTonThat);

    await bank.save();
    return interaction.reply(
      `💥 **THIÊN KIẾP ĐÁNH PHÁ!** Đạo hữu <@${userId}> đột phá thất bại do tâm ma hỗn loạn, kinh mạch nghịch chuyển bị tiêu hao **-${tuViTonThat} Tu Vi**! Chúc đạo hữu may mắn lần sau.`,
    );
  }
}

module.exports = { handleDotPha };
