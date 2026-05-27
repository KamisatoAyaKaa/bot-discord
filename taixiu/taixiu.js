const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require("discord.js");
const bank = require("../bank.js");

// Bộ nhớ tạm để lưu thông tin phiên cược đang diễn ra
let phienCuocHienTai = null;

module.exports = {
  handleTaiXiu: async function (interaction) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // ✨ FIX LỖI 1: Thêm await để đảm bảo lấy được dữ liệu ví từ Cloud về máy
    const player = await bank.getPlayer(userId);

    // ==========================================
    // 1. NGƯỜI CHƠI GÕ LỆNH /TAIXIU
    // ==========================================
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "taixiu"
    ) {
      if (phienCuocHienTai && phienCuocHienTai.dangChay) {
        return interaction.reply({
          content:
            "⚠️ Đang có một ván cược đang đếm ngược, hãy bấm chọn cửa ở bảng tin nhắn phía trên!",
          ephemeral: true,
        });
      }

      // Khởi tạo thông tin phiên cược mới kéo dài 30 giây
      phienCuocHienTai = {
        dangChay: true,
        thoiGianConLai: 30,
        nguoiChoi: {},
      };

      const rowMain = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("tx_select_xiu")
          .setLabel("Xỉu (3–10)")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("tx_select_tai")
          .setLabel("Tài (11–18)")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("tx_select_chan")
          .setLabel("Chẵn")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("tx_select_le")
          .setLabel("Lẻ")
          .setStyle(ButtonStyle.Danger),
      );

      const rowNums1 = new ActionRowBuilder().addComponents(
        [3, 4, 5, 6, 7].map((n) =>
          new ButtonBuilder()
            .setCustomId(`tx_select_num_${n}`)
            .setLabel(`Số ${n}`)
            .setStyle(ButtonStyle.Secondary),
        ),
      );
      const rowNums2 = new ActionRowBuilder().addComponents(
        [8, 9, 10, 11, 12].map((n) =>
          new ButtonBuilder()
            .setCustomId(`tx_select_num_${n}`)
            .setLabel(`Số ${n}`)
            .setStyle(ButtonStyle.Secondary),
        ),
      );
      const rowNums3 = new ActionRowBuilder().addComponents(
        [13, 14, 15, 16, 17].map((n) =>
          new ButtonBuilder()
            .setCustomId(`tx_select_num_${n}`)
            .setLabel(`Số ${n}`)
            .setStyle(ButtonStyle.Secondary),
        ),
      );
      const rowNums4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("tx_select_num_18")
          .setLabel("Số 18")
          .setStyle(ButtonStyle.Secondary),
      );

      const tấtCảHàngNút = [rowMain, rowNums1, rowNums2, rowNums3, rowNums4];

      const buildEmbed = (time) => {
        return new EmbedBuilder()
          .setColor("#2f3136")
          .setTitle("🎰 Tài Xỉu Nêkô – Nhà cái đến từ Châu Á! 🔥🔥🔥")
          .setDescription(
            `Chọn Tài (11–18), Xỉu (3–10), Chẵn/Lẻ hoặc số cụ thể (3–18) để đặt cược.\n` +
              `Sau khi chọn, nhập số tiền bạn muốn cược (tối đa 250,000 🟡).\n` +
              `**Tỉ lệ trả thưởng:**\n` +
              `• Tài/Xỉu/Chẵn/Lẻ: 1:1\n` +
              `• Số cụ thể (3–18): 1:10\n\n` +
              `⚠️ **LƯU Ý:** Không spam bấm nút để tránh lặp form làm độn tiền cược!\n` +
              `⏱️ Trò chơi đang bắt đầu và đếm ngược: **${time} giây**.`,
          );
      };

      const replyMessage = await interaction.reply({
        embeds: [buildEmbed(phienCuocHienTai.thoiGianConLai)],
        components: tấtCảHàngNút,
        fetchReply: true,
      });

      const countdownInterval = setInterval(async () => {
        if (!phienCuocHienTai || !phienCuocHienTai.dangChay) {
          clearInterval(countdownInterval);
          return;
        }

        phienCuocHienTai.thoiGianConLai -= 3;

        if (phienCuocHienTai.thoiGianConLai <= 0) {
          clearInterval(countdownInterval);
          phienCuocHienTai.dangChay = false;

          const xx1 = Math.floor(Math.random() * 6) + 1;
          const xx2 = Math.floor(Math.random() * 6) + 1;
          const xx3 = Math.floor(Math.random() * 6) + 1;
          const tongDiem = xx1 + xx2 + xx3;

          const laTai = tongDiem >= 11 && tongDiem <= 18;
          const laXiu = tongDiem >= 3 && tongDiem <= 10;
          const laChan = tongDiem % 2 === 0;

          let thongBaoKetQua = `🎲 **KẾT QUẢ XÚC XẮC:** ${xx1} - ${xx2} - ${xx3} ➔ 🌟 Tổng: **${tongDiem}** (${laTai ? "TÀI" : "XỈU"} - ${laChan ? "CHẴN" : "LẺ"})\n\n`;
          thongBaoKetQua += `📝 **Chi tiết bảng cược danh sách người chơi:**\n`;

          let coNguoiChoi = false;

          for (const [idUid, dataCuoc] of Object.entries(
            phienCuocHienTai.nguoiChoi,
          )) {
            coNguoiChoi = true;

            // ✨ FIX LỖI 2: Thêm await để lôi đúng ví tiền của từng con bạc tham gia trên mây về
            const pBank = await bank.getPlayer(idUid);
            let isWin = false;
            let thuong = 0;

            if (dataCuoc.cua === "tai" && laTai) {
              isWin = true;
              thuong = dataCuoc.tien * 2;
            } else if (dataCuoc.cua === "xiu" && laXiu) {
              isWin = true;
              thuong = dataCuoc.tien * 2;
            } else if (dataCuoc.cua === "chan" && laChan) {
              isWin = true;
              thuong = dataCuoc.tien * 2;
            } else if (dataCuoc.cua === "le" && !laChan) {
              isWin = true;
              thuong = dataCuoc.tien * 2;
            } else if (
              dataCuoc.cua.startsWith("num_") &&
              parseInt(dataCuoc.cua.split("_")[1]) === tongDiem
            ) {
              isWin = true;
              thuong = dataCuoc.tien * 11;
            }

            if (isWin) {
              pBank.balance += thuong;
              thongBaoKetQua += `🎉 <@${idUid}> cược **${dataCuoc.tenCua}** ($${dataCuoc.tien.toLocaleString()}) ➔ **THẮNG** nhận +$${(thuong - dataCuoc.tien).toLocaleString()}!\n`;
            } else {
              thongBaoKetQua += `💸 <@${idUid}> cược **${dataCuoc.tenCua}** ($${dataCuoc.tien.toLocaleString()}) ➔ **THUA**!\n`;
            }
          }

          // ✨ FIX LỖI 3: Ép đồng bộ kết quả trả thưởng vĩnh viễn lên đám mây MongoDB
          await bank.save();

          if (!coNguoiChoi)
            thongBaoKetQua += `*Không có ai tham gia đặt cược trong lượt này.*`;

          await replyMessage
            .edit({
              embeds: [
                new EmbedBuilder()
                  .setColor("#ff5555")
                  .setTitle("🛑 HẾT GIỜ ĐẶT CƯỢC!")
                  .setDescription(thongBaoKetQua),
              ],
              components: [],
            })
            .catch(() => {});
        } else {
          await replyMessage
            .edit({
              embeds: [buildEmbed(phienCuocHienTai.thoiGianConLai)],
            })
            .catch(() => clearInterval(countdownInterval));
        }
      }, 3000);
    }

    // ==========================================
    // 2. KHI NGƯỜI CHƠI ẤN NÚT CHỌN CỬA CƯỢC
    // ==========================================
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("tx_select_")
    ) {
      if (!phienCuocHienTai || !phienCuocHienTai.dangChay) {
        return interaction.reply({
          content: "❌ Phiên cược đã kết thúc hoặc chưa bắt đầu!",
          ephemeral: true,
        });
      }

      const cuaChon = interaction.customId.replace("tx_select_", "");

      const modal = new ModalBuilder()
        .setCustomId(`tx_modal_${cuaChon}`)
        .setTitle("📥 NHẬP TIỀN ĐẶT CƯỢC");

      const moneyInput = new TextInputBuilder()
        .setCustomId("tx_input_money")
        .setLabel("Nhập số tiền cược ($50 - $250k):")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Ví dụ: 5000")
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(moneyInput);
      modal.addComponents(firstActionRow);

      return interaction.showModal(modal);
    }

    // ==========================================
    // 3. KHI NGƯỜI CHƠI NHẬP TIỀN VÀO MODAL XONG XÁC NHẬN
    // ==========================================
    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith("tx_modal_")
    ) {
      if (!phienCuocHienTai || !phienCuocHienTai.dangChay) {
        return await interaction.reply({
          content:
            "❌ Đã hết thời gian 30s cược, lệnh nhập tiền này không được tính!",
          ephemeral: true,
        });
      }

      const cuaChon = interaction.customId.replace("tx_modal_", "");
      const tienCuocStr =
        interaction.fields.getTextInputValue("tx_input_money");
      const tienCuoc = parseInt(tienCuocStr);

      if (isNaN(tienCuoc) || tienCuoc < 50 || tienCuoc > 250000) {
        return await interaction.reply({
          content:
            "❌ Số tiền cược không hợp lệ! Phải là số từ **$50** đến **$250,000**.",
          ephemeral: true,
        });
      }

      if (player.balance < tienCuoc) {
        return await interaction.reply({
          content: `❌ Bạn không đủ tiền! Ví hiện tại: **$${player.balance.toLocaleString()}**`,
          ephemeral: true,
        });
      }

      // Tiến hành trừ tiền cược trong ngân hàng chung ngay lập tức
      player.balance -= tienCuoc;

      // ✨ FIX LỖI 4: Ép lưu số dư mới của con bạc lên Cloud ngay khi vừa trừ tiền cược đầu ván
      await bank.save();

      let tenCua = cuaChon.toUpperCase();
      if (cuaChon.startsWith("num_")) tenCua = `Số ${cuaChon.split("_")[1]}`;

      // Ghi nhận dữ liệu cược của người này vào hệ thống phiên chung
      phienCuocHienTai.nguoiChoi[userId] = {
        cua: cuaChon,
        tenCua: tenCua,
        tien: tienCuoc,
      };

      await interaction.reply({
        content: `✅ Đã đặt cược thành công **$${tienCuoc.toLocaleString()}** vào cửa **${tenCua}**! Hãy chờ hết thời gian đếm ngược kết quả nhé.`,
        ephemeral: true,
      });
    }
  },
};
