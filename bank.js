require("dotenv").config();
const mongoose = require("mongoose");

// Tắt buffering để Mongoose không chờ vô hạn khi DB chưa kết nối
mongoose.set("bufferCommands", false);

// 1. Kết nối tới Cloud Database
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() =>
    console.log("🟢 Đã kết nối thành công tới Cloud Database (MongoDB)!"),
  )
  .catch((err) => console.error("🔴 Lỗi kết nối Cloud Database:", err));

// 2. Định nghĩa cấu trúc khung (Schema)
const PlayerSchema = new mongoose.Schema({
  _id: String,
  balance: { type: Number, default: 0 },
  tutien: {
    initialized: { type: Boolean, default: false },
    linhCan: { type: String, default: "Chưa thức tỉnh" },
    ngoTinh: { type: String, default: "Chưa đo đạc" },
    theChat: { type: String, default: "Phàm Thể" },
    khiVan: { type: String, default: "Bình Thường" },
    canhGioi: { type: String, default: "Phàm Nhân" },
    tang: { type: Number, default: 0 },
    tuVi: { type: Number, default: 0 },
    tuViCanThiet: { type: Number, default: 100 },
    lastLuyenCong: { type: String, default: null },
    luotTuLuyen: { type: Number, default: 20 }, // Mặc định vào game có sẵn 20 lượt
    lastUpdateLuot: { type: Number, default: Date.now }, // Mốc thời gian tính lượt hồi
    daoLu: {
      hasPartner: { type: Boolean, default: false }, // Đã cưới/thu nhận NPC chưa
      npcId: { type: String, default: null }, // ID của NPC nữ đang đồng hành
      thanMat: { type: Number, default: 0 }, // Điểm thân mật (Càng cao song tu càng nhiều exp)
      lastSongTu: { type: Number, default: 0 }, // Cooldown thời gian song tu
    },
  },
});

const PlayerModel = mongoose.model("Player", PlayerSchema);
let memoryCache = {};
const createDefaultPlayer = (userId) => ({
  _id: userId,
  balance: 0,
  tutien: {
    initialized: false,
    linhCan: "Chưa thức tỉnh",
    ngoTinh: "Chưa đo đạc",
    theChat: "Phàm Thể",
    khiVan: "Bình Thường",
    canhGioi: "Phàm Nhân",
    tang: 0,
    tuVi: 0,
    tuViCanThiet: 100,
    lastLuyenCong: null,
    luotTuLuyen: 20,
    lastUpdateLuot: Date.now(),
    daoLu: {
      hasPartner: false,
      npcId: null,
      thanMat: 0,
      lastSongTu: 0,
    },
  },
});
// Cấu hình thời gian cho lệnh điểm danh hàng ngày
const COOLDOWN_DAILY = 24 * 60 * 60 * 1000; // 24 giờ tính bằng mili-giây
let dailyCooldownCache = {}; // Lưu tạm thời gian điểm danh

module.exports = {
  // Chuyển thành hàm async để ép bot phải chờ tải data trên mây về
  getPlayer: async function (userId) {
    if (!memoryCache[userId]) {
      try {
        const doc = await PlayerModel.findById(userId);
        if (doc) {
          memoryCache[userId] = doc.toObject();
        } else {
          memoryCache[userId] = {
            _id: userId,
            balance: 0,
            tutien: {
              initialized: false,
              linhCan: "Chưa thức tỉnh",
              ngoTinh: "Chưa đo đạc",
              theChat: "Phàm Thể",
              khiVan: "Bình Thường",
              canhGioi: "Phàm Nhân",
              tang: 0,
              tuVi: 0,
              tuViCanThiet: 100,
              lastLuyenCong: null,
              luotTuLuyen: 20,
              lastUpdateLuot: Date.now(),
              daoLu: {
                hasPartner: false,
                npcId: null,
                thanMat: 0,
                lastSongTu: 0,
              },
            },
          };
        }
      } catch (err) {
        console.error("🔴 Lỗi khi tải data từ Cloud:", err);
        memoryCache[userId] = createDefaultPlayer(userId);
      }
    }

    // Nếu dữ liệu cũ lưu daoLu top-level, chuyển vào tutien.daoLu để tương thích với code hiện tại
    if (memoryCache[userId]) {
      if (
        memoryCache[userId].daoLu &&
        (!memoryCache[userId].tutien || !memoryCache[userId].tutien.daoLu)
      ) {
        memoryCache[userId].tutien = memoryCache[userId].tutien || {};
        memoryCache[userId].tutien.daoLu = memoryCache[userId].daoLu;
        delete memoryCache[userId].daoLu;
      }

      if (memoryCache[userId].tutien && !memoryCache[userId].tutien.daoLu) {
        memoryCache[userId].tutien.daoLu = {
          hasPartner: false,
          npcId: null,
          thanMat: 0,
          lastSongTu: 0,
        };
      }
    }

    // Đảm bảo dữ liệu lượt tu luyện luôn tồn tại khi gọi player
    if (
      memoryCache[userId] &&
      memoryCache[userId].tutien &&
      memoryCache[userId].tutien.luotTuLuyen === undefined
    ) {
      memoryCache[userId].tutien.luotTuLuyen = 20;
      memoryCache[userId].tutien.lastUpdateLuot = Date.now();
    }

    return memoryCache[userId];
  },

  // Hàm tự động hồi phục lượt tu luyện dựa trên thời gian thực
  hoiLuotTuLuyen: function (player) {
    if (!player || !player.tutien) return;

    const bayGio = Date.now();
    if (!player.tutien.lastUpdateLuot) player.tutien.lastUpdateLuot = bayGio;

    const thoiGianDaQua = bayGio - player.tutien.lastUpdateLuot;
    const thoiGianHoiMotLuot = 30 * 60 * 1000; // 30 phút đổi ra mili-giây

    if (thoiGianDaQua >= thoiGianHoiMotLuot) {
      const soLuotDuocHoi = Math.floor(thoiGianDaQua / thoiGianHoiMotLuot);

      if (soLuotDuocHoi > 0) {
        player.tutien.luotTuLuyen = Math.min(
          20,
          (player.tutien.luotTuLuyen || 0) + soLuotDuocHoi,
        );
        player.tutien.lastUpdateLuot =
          player.tutien.lastUpdateLuot + soLuotDuocHoi * thoiGianHoiMotLuot;
      }
    }

    if (player.tutien.luotTuLuyen >= 20) {
      player.tutien.lastUpdateLuot = bayGio;
    }
  },

  // Hàm lưu vĩnh viễn dữ liệu từ cache lên Cloud
  save: async function () {
    try {
      for (const userId in memoryCache) {
        const data = memoryCache[userId];
        await PlayerModel.findByIdAndUpdate(userId, data, { upsert: true });
      }
      console.log("💾 [Cloud DB] Đã đồng bộ toàn bộ dữ liệu lên Đám Mây!");
    } catch (error) {
      console.error("🔴 Lỗi khi lưu lên Cloud:", error);
    }
  },

  // =========================================================
  // ✨ ĐÃ KHÔI PHỤC: HÀM XỬ LÝ LỆNH NGÂN HÀNG TRÊN NỀN TẢNG CLOUD
  // =========================================================
  handleBankCommands: async function (interaction) {
    const userId = interaction.user.id;
    const player = await this.getPlayer(userId); // Gọi hàm lấy data an toàn từ mây

    // A. LỆNH KIỂM TRA VÍ TIỀN (/vi)
    if (interaction.commandName === "vi") {
      return interaction.reply({
        content: `💰 **THÔNG TIN VÍ TIỀN**\n➔ Đạo hữu <@${userId}> hiện đang sở hữu: **$${player.balance.toLocaleString()}** Linh Thạch.`,
        ephemeral: true,
      });
    }

    // B. LỆNH ĐIỂM DANH HÀNG NGÀY (/daily)
    if (interaction.commandName === "daily") {
      const bayGio = Date.now();
      const thoiGianDaQua = bayGio - (dailyCooldownCache[userId] || 0);

      if (thoiGianDaQua < COOLDOWN_DAILY) {
        const thoiGianConLai = COOLDOWN_DAILY - thoiGianDaQua;
        const soGio = Math.floor(thoiGianConLai / (60 * 60 * 1000));
        const soPhut = Math.ceil(
          (thoiGianConLai % (60 * 60 * 1000)) / (60 * 1000),
        );

        return interaction.reply({
          content: `⚠️ **Thừa cơ trục lợi?** Đạo hữu đã nhận linh thạch ngày hôm nay rồi. Hãy tĩnh tọa chờ thêm **${soGio} giờ ${soPhut} phút** nữa để nhận lần tiếp theo.`,
          ephemeral: true,
        });
      }

      // Phát thưởng ngẫu nhiên từ $5,000 đến $15,000 Linh Thạch
      const tienThuong = Math.floor(Math.random() * 10001) + 5000;
      player.balance += tienThuong;
      dailyCooldownCache[userId] = bayGio;

      await this.save(); // Đồng bộ số dư mới lên mây Atlas

      return interaction.reply({
        content: `🎉 **ĐIỂM DANH THÀNH CÔNG!** Đạo hữu nhận được **+$${tienThuong.toLocaleString()}** Linh Thạch bổ trợ tu hành. Ví hiện tại: **$${player.balance.toLocaleString()}**`,
      });
    }

    // C. LỆNH ADMIN BUFF TIỀN (/addtien) - ĐÃ CẬP NHẬT CỘNG/TRỪ ĐA NĂNG
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "addtien"
    ) {
      const targetUser = interaction.options.getUser("nguoi_nhan");
      const soTienBuff = interaction.options.getInteger("so_tien"); // Nhận cả số âm và dương

      // Gọi lấy hồ sơ ví tiền của người bị tác động trên hệ thống cache/cloud
      const targetPlayer = await this.getPlayer(targetUser.id);
      const currentBalance = targetPlayer.balance;

      // 🔄 TRƯỜNG HỢP 1: ADMIN NHẬP SỐ DƯƠNG -> CỘNG TIỀN
      if (soTienBuff >= 0) {
        targetPlayer.balance += soTienBuff;
        await this.save(); // Lưu ngay lên Cloud

        return interaction.reply({
          content: `⚡ **QUYỀN NĂNG TỐI CAO!** Admin đã ban phát **+$${soTienBuff.toLocaleString()}** Linh Thạch vào tài khoản của <@${targetUser.id}>!\n➔ Số dư mới: **$${targetPlayer.balance.toLocaleString()}** Linh Thạch.`,
        });
      }

      // 📉 TRƯỜNG HỢP 2: ADMIN NHẬP SỐ ÂM -> THU HỒI / TRỪ TIỀN
      else {
        const soTienTruTuyetDoi = Math.abs(soTienBuff); // Đổi số âm thành số dương để dễ so sánh (Ví dụ: -5000 thành 5000)
        let thongBaoKhaQuang = "";

        // Nếu số tiền định trừ vượt quá số linh thạch họ đang có
        if (soTienTruTuyetDoi > currentBalance) {
          targetPlayer.balance = 0; // Trực tiếp bóp chết ví tiền, đưa thẳng về 0
          thongBaoKhaQuang = `💸 **KHẤU TRỪ TRIỆT ĐỂ!** Đạo hữu <@${targetUser.id}> không đủ **$${soTienTruTuyetDoi.toLocaleString()}** Linh Thạch để nộp phạt. Admin đã tịch thu sạch sành sanh toàn bộ đại sản nghiệp, ép số dư về **$0**!`;
        }
        // Nếu túi tiền của họ đủ để trừ cuốn chiếu
        else {
          targetPlayer.balance -= soTienTruTuyetDoi;
          thongBaoKhaQuang = `📉 **THU HỒI LINH THẠCH!** Admin đã giáng thiên phạt, thu hồi **-$${soTienTruTuyetDoi.toLocaleString()}** Linh Thạch từ túi của <@${targetUser.id}>!\n➔ Số dư còn lại: **$${targetPlayer.balance.toLocaleString()}** Linh Thạch.`;
        }

        await this.save(); // Đồng bộ vĩnh viễn dữ liệu mới nộp phạt lên mây
        return interaction.reply({ content: thongBaoKhaQuang });
      }
    }
  },
};
