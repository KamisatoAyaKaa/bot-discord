const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const bank = require('../bank.js');
const { thucTinhSoMenh } = require('./properties.js'); // Import bộ bốc quẻ ngẫu nhiên từ properties.js

async function xemProfile(interaction) {
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const player = bank.getPlayer(userId);
    const tt = player.tutien;

    // LẦN ĐẦU NHẬP MÔN: Bốc trọn gói combo số mệnh (Linh Căn + Ngộ Tính + Thể Chất + Khí Vận)
    if (!tt.initialized) {
        const soMenhMoi = thucTinhSoMenh();
        
        // Ghi nhận toàn bộ thông số bẩm sinh vào database
        tt.initialized = true;
        tt.linhCan = soMenhMoi.linhCan;
        tt.ngoTinh = soMenhMoi.ngoTinh;
        tt.theChat = soMenhMoi.theChat;
        tt.khiVan = soMenhMoi.khiVan;
        
        // Trạng thái xuất phát điểm
        tt.canhGioi = 'Phàm Nhân';
        tt.tang = 0;
        tt.tuVi = 0;
        tt.tuViCanThiet = 100;
        
        bank.save(); // Lưu vĩnh viễn xuống file database.json

        // Giao diện thông báo thức tỉnh Tiên Duyên hoành tráng
        const embedWelcome = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle(`✨ ĐẠI ĐẠO DUYÊN KHỞI - TIÊN DUYÊN THỨC TỈNH ✨`)
            .setDescription(
                `Chào mừng đạo hữu **${username}** thức tỉnh thiên tư, chính thức bước chân vào con đường nghịch thiên cải mệnh!\n\n` +
                `🔮 **Linh Căn Thiên Tư:**\n➔ ${tt.linhCan}\n\n` +
                `🧠 **Ngộ Tính Căn Cơ:**\n➔ ${tt.ngoTinh}\n\n` +
                `🧬 **Thể Chất Đặc Biệt:**\n➔ ${tt.theChat}\n\n` +
                `🎲 **Khí Vận Định Số:**\n➔ ${tt.khiVan}\n\n` +
                `*Vạn vạn phàm nhân mới có một người mở ra đạo căn! Hãy gõ lại lệnh \`/tutien\` để mở giao diện Tu Luyện chính thức.*`
            )
            .setFooter({ text: 'Trời đất chứng giám • Số mệnh đã định' });

        return interaction.editReply({ embeds: [embedWelcome] });
    }

    // GIAO DIỆN HỒ SƠ ĐẠO ĐỒ CHÍNH (Hiển thị khi đã khởi tạo nhân vật xong)
    const embedProfile = new EmbedBuilder()
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
            { name: '✨ Tu Vi Tích Lũy', value: `\`${tt.tuVi} / ${tt.tuViCanThiet}\` Điểm`, inline: true },
            { name: '🟡 Linh Thạch Sở Hữu', value: `**$${player.balance.toLocaleString()}**`, inline: true }
        )
        .setDescription(`*Đường tu tiên dài đằng đẵng, vững bước kiên trì mới mong đắc đạo thành tiên!*`)
        .setFooter({ text: 'Hãy bấm nút bên dưới để vận công hoặc tiến hành đột phá thiên kiếp' });

    // Cặp nút bấm tương tác chính dưới Embed
    const rowButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tt_luyen_cong').setLabel('🧘 Vận Công Luyện Khí').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('tt_dot_pha').setLabel('⚡ Đột Phá Cảnh Giới').setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({ embeds: [embedProfile], components: [rowButtons] });
}

module.exports = { xemProfile };