const { xemProfile } = require("./profile.js");
const { handleTuLuyen } = require("./tuluyen.js"); // Import file tu luyện mới tạo
const { handleDotPha } = require("./dotpha.js");

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
};
