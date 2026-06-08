const { EmbedBuilder } = require("discord.js");
const { xemProfile } = require("./profile.js");
const { handleTuLuyen } = require("./tuluyen.js");
const { handleDotPha } = require("./dotpha.js");
const bank = require("../bank.js"); // Tra cứu trực tiếp dữ liệu mây qua bank
const { GoogleGenAI } = require("@google/genai");

let ai = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (e) {
    console.error(
      "🔴 Thất bại khi thiết lập thực thể Gemini AI (Có thể sai định dạng Key):",
      e.message,
    );
  }
} else {
  console.warn(
    "⚠️ Cảnh báo: GEMINI_API_KEY chưa được khai báo trong file .env!",
  );
}

module.exports = {
  // Đầu mối trung tâm tiếp nhận toàn bộ tương tác từ file index.js chuyển sang
  handleTuTien: async function (interaction) {
    try {
      // ==========================================
      // 🧭 PHÂN LUỒNG ĐIỀU PHỐI CÁC LỆNH GẠCH CHÉO (/)
      // ==========================================
      if (interaction.isChatInputCommand()) {
        const cmd = interaction.commandName;

        if (cmd === "tutien") {
          await interaction.deferReply({ ephemeral: true });
          return xemProfile(interaction);
        }

        // ✨ THÊM MỚI: Tiếp nhận luồng lệnh thiết kế Tiên Nữ động vào DB
        if (cmd === "taodaolu") {
          await interaction.deferReply();
          return this.handleTaoDaoLuVaoDB(interaction);
        }

        if (cmd === "cuointc") {
          await interaction.deferReply();
          return this.handleCuoiNPC(interaction);
        }

        if (cmd === "songtu") {
          await interaction.deferReply();
          return this.handleSongTu(interaction);
        }

        if (cmd === "trochuyen") {
          await interaction.deferReply();
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
    } catch (err) {
      console.error("🔴 Lỗi điều phối hệ thống Tu Tiên:", err);
      try {
        if (interaction.deferred && !interaction.replied) {
          await interaction
            .editReply({
              content:
                "❌ Trục trặc hệ thống điều phối linh lực! Xin thử lại sau.",
            })
            .catch(() => {});
        } else if (!interaction.replied) {
          await interaction
            .reply({
              content: "❌ Trục trặc hệ thống điều phối linh lực!",
              ephemeral: true,
            })
            .catch(() => {});
        }
      } catch (replyErr) {
        console.error("🔴 Lỗi khi phản hồi sau lỗi Tu Tiên:", replyErr);
      }
    }
  },

  // ✨ THÊM MỚI: Logic bốc tách thông số, dệt sinh mệnh mới lưu vào Database Server
  handleTaoDaoLuVaoDB: async function (interaction) {
    const userId = interaction.user.id;
    const player = await bank.getPlayer(userId);
    const GIA_TAO_NPC = 150000; // Chi phí tiêu tốn linh thạch khi tự tạo

    if (player.balance < GIA_TAO_NPC) {
      return interaction.editReply({
        content: `❌ **Nghèo túng đường tu!** Đạo hữu cần \`$${GIA_TAO_NPC.toLocaleString()}\` Linh Thạch để dệt nên một sinh mệnh mới vào Tiên Các. Bạn hiện chỉ có \`$${player.balance.toLocaleString()}\`.`,
      });
    }

    const ten = interaction.options.getString("ten").trim();
    const tinhCach = interaction.options.getString("tinh_cach").trim();

    // Thuật toán làm sạch chuỗi: Khử dấu tiếng Việt, biến đổi khoảng trắng thành dấu gạch dưới để làm mã tra cứu
    const npcId = ten
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_");

    // Rà soát xem mã ID Tiên Nữ này đã bị trùng lặp trên Database mây chưa
    const checkTrung = await bank.NpcModel.findOne({ npcId });
    if (checkTrung) {
      return interaction.editReply({
        content: `⚠️ **Duyên pháp trùng lặp!** Trong Tiên Các đã có một vị Tiên Nữ danh hiệu tương tự hoặc trùng mã tra cứu (\`${npcId}\`), vui lòng đặt tên khác biệt!`,
      });
    }

    // Ép Prompt AI định hình phong thái ngôn từ kiếm hiệp
    const promptAI = `Bạn là ${ten}, một nữ tu sĩ tiên phong và là Đạo Lữ (vợ) của người đang nói chuyện. Bạn có đặc điểm tính cách: ${tinhCach}. Hãy luôn xưng là 'Thiếp' hoặc '${ten}' và gọi người kia là 'Phu quân' hoặc 'Đạo hữu'. Tuyệt đối không được nói mình là AI, hãy trả lời ngắn gọn dưới 3 câu theo văn phong kiếm hiệp, tu tiên huyền huyễn cổ trang.`;

    // Khấu khấu linh thạch từ túi tiền người khởi tạo
    player.balance -= GIA_TAO_NPC;
    const playerCache = await bank.getPlayer(userId);
    playerCache.balance = player.balance;
    await bank.save();

    // Đẩy gói tin dữ liệu Tiên Nữ mới lên MongoDB
    const npcMoi = new bank.NpcModel({
      npcId,
      ten,
      tinhCach,
      xuatThan: `${interaction.user.username} Tạo Ra`,
      giaCuoi: 100000, // Chi phí cho người sau rước về làm vợ là 100k linh thạch
      buffExp: 1.3, // Chỉ số buff exp gốc mặc định
      promptAI,
    });
    await npcMoi.save();

    return interaction.editReply({
      content: `✨ **TẠO HÓA SINH LINH!** Đạo hữu đã tiêu hao **$${GIA_TAO_NPC.toLocaleString()}** Linh Thạch. Khai mở trận pháp, thành công đưa Tiên Nữ **${ten}** vào danh sách Tiên Các chung của Server!\n➔ *Mã tra cứu kết hôn:* \`${npcId}\`\n➔ Từ bây giờ, bất kỳ ai trên máy chủ cũng có thể dùng lệnh \`/cuointc\` nhập mã trên để rước nàng đồng hành!`,
    });
  },

  // ✨ ĐÃ ĐẠI TƯ: Logic kết hôn kéo dữ liệu trực tiếp bằng lệnh quét động trên DB mây
  handleCuoiNPC: async function (interaction) {
    const userId = interaction.user.id;
    const player = await bank.getPlayer(userId);

    if (!player.tutien.daoLu) {
      player.tutien.daoLu = {
        hasPartner: false,
        npcId: null,
        thanMat: 0,
        lastSongTu: 0,
      };
    }

    if (player.tutien.daoLu.hasPartner) {
      return interaction.editReply({
        content:
          "⚠️ **Tham lam vô độ!** Đạo hữu đã có một vị Đạo Lữ đồng hành rồi, không thể kết nạp thêm!",
      });
    }

    const maTraCuu = interaction.options
      .getString("ma_tien_nu")
      .toLowerCase()
      .trim();

    // 🌐 TRUY VẤN ĐỘNG: Quét kho dữ liệu MongoDB mây tìm kiếm Tiên Nữ
    const npcSelected = await bank.NpcModel.findOne({ npcId: maTraCuu });

    if (!npcSelected) {
      return interaction.editReply({
        content: `❌ **Tìm kiếm vô vọng!** Mã Tiên Nữ \`${maTraCuu}\` không tồn tại trong kho lưu trữ Tiên Các. Hãy kiểm tra lại chính xác mã hoặc tự thiết kế bằng lệnh \`/taodaolu\`!`,
      });
    }

    if (player.balance < npcSelected.giaCuoi) {
      return interaction.editReply({
        content: `❌ **Nghèo túng đường tu!** Đạo hữu cần \`$${npcSelected.giaCuoi.toLocaleString()}\` Linh Thạch để rước **${npcSelected.ten}** làm Đạo Lữ. Bạn hiện chỉ có \`$${player.balance.toLocaleString()}\`.`,
      });
    }

    // Khấu trừ linh thạch và gán mã định danh Đạo Lữ động
    player.balance -= npcSelected.giaCuoi;
    player.tutien.daoLu = {
      hasPartner: true,
      npcId: npcSelected.npcId,
      thanMat: 10,
      lastSongTu: 0,
    };

    await bank.save();

    return interaction.editReply({
      content: `🎉 **THÀNH THÂN ĐẠI CÁT!** Đạo hữu đã tiêu hao **$${npcSelected.giaCuoi.toLocaleString()}** Linh Thạch, chính thức rước **${npcSelected.ten}** (${npcSelected.xuatThan}) về làm Đạo Lữ phủ đệ! Từ nay gắn kết vận mệnh, cùng nhau nghịch thiên cải mệnh!`,
    });
  },

  // ✨ ĐÃ ĐẠI TƯ: Logic song tu kéo thông số buffExp động từ Database
  handleSongTu: async function (interaction) {
    const userId = interaction.user.id;
    const player = await bank.getPlayer(userId);

    if (!player.tutien.daoLu || !player.tutien.daoLu.hasPartner) {
      return interaction.editReply({
        content:
          "⚠️ **Cơ hàn cô độc!** Đạo hữu chưa có Đạo Lữ, hãy tích lũy linh thạch cưới một Tiên Nữ về rồi mới có thể song tu!",
      });
    }

    const bayGio = Date.now();
    const thoiGianCho = 2 * 60 * 60 * 1000;
    const daQua = bayGio - (player.tutien.daoLu.lastSongTu || 0);

    if (daQua < thoiGianCho) {
      const conLai = Math.ceil((thoiGianCho - daQua) / (60 * 1000));
      return interaction.editReply({
        content: `⏱️ **Nguyên khí chưa hồi phục!** Đạo hữu và Đạo Lữ cần nghỉ ngơi. Hãy quay lại sau **${conLai} phút** nữa.`,
      });
    }

    // 🌐 TRUY VẤN ĐỘNG: Lấy chỉ số nhân Exp của Tiên Nữ trên DB mây
    const npcInfo = await bank.NpcModel.findOne({
      npcId: player.tutien.daoLu.npcId,
    });

    if (!npcInfo) {
      return interaction.editReply({
        content:
          "❌ **Linh thức tiêu tán!** Không tìm thấy dữ liệu gốc của vị Đạo Lữ này trong hệ thống Tiên Các Server.",
      });
    }

    const tuViGoc = Math.floor(Math.random() * 51) + 50;
    const tuViThucTe = Math.floor(tuViGoc * npcInfo.buffExp);

    player.tutien.tuVi += tuViThucTe;
    player.tutien.daoLu.thanMat += 5;
    player.tutien.daoLu.lastSongTu = bayGio;

    await bank.save();

    return interaction.editReply({
      content: `🧘‍♂️ **VẬN CÔNG SONG TU!** Bạn và **${npcInfo.ten}** cùng nhau ngồi xếp bằng, linh lực hòa quyện dòng chảy giao thoa.\n➔ Nhận được **+${tuViThucTe} Tu Vi** (Đã kích hoạt buff x${npcInfo.buffExp} từ Đạo Lữ).\n➔ Điểm thân mật tăng lên: \`${player.tutien.daoLu.thanMat} Pts\`.`,
    });
  },

  // ✨ ĐÃ ĐẠI TƯ: Trò chuyện AI kéo chỉ thị đóng vai (Prompt động) từ Database mây
  handleTroChuyenAI: async function (interaction) {
    const userId = interaction.user.id;
    const player = await bank.getPlayer(userId);

    if (!player.tutien.daoLu || !player.tutien.daoLu.hasPartner) {
      return interaction.editReply({
        content:
          "⚠️ Đạo hữu chưa có Đạo Lữ đồng hành, định truyền âm nhập mật với hư vô sao? Hãy dùng `/cuointc` trước!",
      });
    }

    if (!ai) {
      return interaction.editReply({
        content:
          "❌ **Linh thông gián đoạn!** Hệ thống Tiên Nữ AI hiện chưa được khởi tạo đúng cách hoặc sai cấu hình API Key trong file `.env`!",
      });
    }

    const tinNhanCuaBan = interaction.options.getString("noi_dung");

    // 🌐 TRUY VẤN ĐỘNG: Rút chỉ thị systemInstruction được người tạo tùy biến từ MongoDB lên
    const npcInfo = await bank.NpcModel.findOne({
      npcId: player.tutien.daoLu.npcId,
    });

    if (!npcInfo) {
      return interaction.editReply({
        content:
          "❌ **Kinh mạch đứt đoạn!** Không bốc tách được linh hồn nhập vai của Đạo Lữ từ Database mây!",
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: tinNhanCuaBan }] }],
        config: {
          systemInstruction: npcInfo.promptAI, // Ép AI đóng vai theo chỉ thị động trên mây
          temperature: 0.7,
        },
      });

      const loiTienNu = response.text;

      player.tutien.daoLu.thanMat += 1;
      await bank.save();

      const embedAI = new EmbedBuilder()
        .setColor("#ff5555")
        .setTitle(`🎎 Đạo Lữ Phản Hồi: ${npcInfo.ten}`)
        .addFields(
          { name: `💬 Lời của đạo hữu:`, value: `*\"${tinNhanCuaBan}\"*` },
          { name: `🌸 ${npcInfo.ten} đáp:`, value: `**\"${loiTienNu}\"**` },
        )
        .setFooter({
          text: `📊 Thân mật: ${player.tutien.daoLu.thanMat} Pts | Định Ước Tiên Các Động trên MongoDB mây`,
        });

      return await interaction.editReply({ embeds: [embedAI] });
    } catch (err) {
      console.error("🔴 Lỗi điều phối hệ thống Tu Tiên:", err);

      // ✨ FIX DỨT ĐIỂM: Kiểm tra toàn diện trạng thái gói tin trước khi gửi phản hồi lỗi
      try {
        if (interaction.deferred) {
          // Nếu đã dùng deferReply trước đó
          await interaction
            .editReply({
              content:
                "❌ Trục trặc hệ thống điều phối linh lực! Xin hãy thử lại sau.",
            })
            .catch(() => {});
        } else if (interaction.replied) {
          // Nếu đã dùng reply hoặc update trước đó, gửi một tin nhắn phụ đi kèm chống treo luồng
          await interaction
            .followUp({
              content:
                "❌ Phát sinh lỗi ngầm khi vận chuyển chu thiên, linh lực hỗn loạn!",
              ephemeral: true,
            })
            .catch(() => {});
        } else {
          // Nếu chưa có bất kỳ phản hồi nào
          await interaction
            .reply({
              content: "❌ Trục trặc hệ thống điều phối linh lực!",
              ephemeral: true,
            })
            .catch(() => {});
        }
      } catch (replyErr) {
        console.error(
          "🔴 Không thể gửi thông báo lỗi đến người chơi:",
          replyErr.message,
        );
      }
    }
  },
};
