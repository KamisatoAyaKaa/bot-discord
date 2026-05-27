const bank = require('../bank.js');
const { PHAM_CHAT_LINH_CAN, NGO_TINH, THE_CHAT } = require('./properties.js');

async function handleTuLuyen(interaction) {
    const userId = interaction.user.id;
    const player = await bank.getPlayer(userId);
    const tt = player.tutien; // Sử dụng key tutien đã đồng bộ

    const now = new Date();
    const COOLDOWN_TU_LUYEN = 60 * 1000; // 1 phút hồi chiêu kinh mạch (60000 ms)

    // 1. Kiểm tra thời gian hồi chiêu (Cooldown) kinh mạch
    if (tt.lastLuyenCong) {
        const timePassed = now - new Date(tt.lastLuyenCong);
        if (timePassed < COOLDOWN_TU_LUYEN) {
            const secondsLeft = Math.ceil((COOLDOWN_TU_LUYEN - timePassed) / 1000);
            return interaction.reply({ 
                content: `⚠️ **Kinh mạch chấn động!** Đạo hữu đang trong trạng thái hồi khí, hãy chờ **${secondsLeft} giây** nữa để tiếp tục vận công hấp thu linh khí.`, 
                ephemeral: true 
            });
        }
    }

    // 2. Tìm kiếm thông tin thuộc tính thực tế để lấy tỷ lệ % bonus
    // Trích xuất tên phẩm chất từ chuỗi linh căn (Ví dụ: "天 Thiên Linh Căn..." -> lấy chữ "Thiên Linh Căn")
    const lcObj = PHAM_CHAT_LINH_CAN.find(lc => tt.linhCan.includes(lc.name.split(' ')[1])) || PHAM_CHAT_LINH_CAN[0];
    const ntObj = NGO_TINH.find(nt => nt.name === tt.ngoTinh) || NGO_TINH[0];
    const tcObj = THE_CHAT.find(tc => tc.name === tt.theChat) || THE_CHAT[0];

    // 3. Định nghĩa Tu Vi Gốc (baseSpeed) ngẫu nhiên mỗi lần bấm (Từ 15 đến 25 điểm)
    let baseTuVi = Math.floor(Math.random() * 11) + 15; 

    // 4. Tính toán tổng các chỉ số cộng thêm (totalBonus)
    let totalBonus = lcObj.bonusTuVi + ntObj.bonusTuVi + tcObj.bonusTuVi;

    // 5. Áp dụng công thức yêu cầu: finalSpeed = baseSpeed * (1 + totalBonus)
    let tuViNhanDuoc = Math.floor(baseTuVi * Math.max(1 + totalBonus, 0.1));

    // 6. Tiến hành cộng Tu Vi vào nhân vật và lưu vào database
    // (Đoạn code tính tuViNhanDuoc ở trên giữ nguyên 100%)
    // 6. Tiến hành cộng Tu Vi vào nhân vật và lưu vào database
    tt.tuVi += tuViNhanDuoc;
    tt.lastLuyenCong = now.toISOString();
    bank.save(); // Ghi xuống database.json

    // 🚀 BƯỚC NÂNG CẤP: Import lại Embed và Nút bấm để vẽ lại bảng hồ sơ mới
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const embedProfileMoi = new EmbedBuilder()
        .setColor('#1abc9c')
        .setTitle(`🧘 ĐẠO ĐỒ HỒ SƠ - THỜI KHÔNG TU LUYỆN`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
            { name: '👤 Tu Sĩ', value: `<@${userId}>`, inline: true },
            { name: '⚔️ Cảnh Giới Hiện Tại', value: `**${tt.canhGioi} ${tt.tang > 0 ? `- Tầng ${tt.tang}` : ''}**`, inline: true },
            { name: '🔮 Linh Căn Thuộc Tính', value: `${tt.linhCan}`, inline: false },
            { name: '🧠 Ngộ Tính Tư Chất', value: `${tt.ngoTinh}`, inline: true },
            { name: '🎲 Khí Vận Định Số', value: `${tt.khiVan}`, inline: true },
            { name: '🧬 Thể Chất Đặc Biệt', value: `${tt.theChat}`, inline: false },
            { name: '✨ Tu Vi Tích Lũy', value: `\`${tt.tuVi} / ${tt.tuViCanThiet}\` Điểm`, inline: true }, // Số tu vi mới đã được cập nhật ở đây
            { name: '🟡 Linh Thạch Sở Hữu', value: `**$${player.balance.toLocaleString()}**`, inline: true }
        )
        .setDescription(`*✨ Đạo hữu vừa tu luyện và nhận được **+${tuViNhanDuoc} Tu Vi**!*`)
        .setFooter({ text: 'Hãy tiếp tục vận công khi kinh mạch ổn định hoặc tiến hành đột phá thiên kiếp' });

    const rowButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tt_luyen_cong').setLabel('🧘 Vận Công Luyện Khí').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('tt_dot_pha').setLabel('⚡ Đột Phá Cảnh Giới').setStyle(ButtonStyle.Danger)
    );

    // Sử dụng interaction.update để ghi đè trực tiếp lên bảng cũ, tạo hiệu ứng làm mới thời gian thực
    return interaction.update({ 
        embeds: [embedProfileMoi], 
        components: [rowButtons] 
    });
}

module.exports = { handleTuLuyen };