const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const bank = require('../bank.js'); // Lùi một thư mục để gọi file bank.js chung

// Tỉ lệ % xuất hiện các loại Linh Căn khi bốc quẻ nhập môn
const DANH_SACH_LINH_CAN = [
    { name: '伪 Ngũ Linh Căn (Phế Linh Căn)', rate: 50, buff: 1.0 },
    { name: '真 Chân Linh Căn (Hệ thường)', rate: 35, buff: 1.5 },
    { name: '变 Biến Dị Linh Căn (Hệ hiếm)', rate: 12, buff: 2.2 },
    { name: '天 Thiên Linh Căn (Trời ban tài ba)', rate: 3, buff: 3.5 }
];

// Hàm thuật toán quay ngẫu nhiên theo tỷ lệ phần trăm
function randomLinhCan() {
    const rand = Math.random() * 100;
    let sum = 0;
    for (const lc of DANH_SACH_LINH_CAN) {
        sum += lc.rate;
        if (rand <= sum) return lc;
    }
    return DANH_SACH_LINH_CAN[0];
}

// Hàm xử lý chính khi người dùng gõ lệnh /tutien
async function xemProfile(interaction) {
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const player = bank.getPlayer(userId);
    const tt = player.tutien;

    // THÀNH LẬP NHÂN VẬT (Nếu chưa gõ lệnh này bao giờ)
    if (!tt.initialized) {
        const lcChon = randomLinhCan();
        
        // Cập nhật dữ liệu vào database
        tt.initialized = true;
        tt.linhCan = lcChon.name;
        tt.canhGioi = 'Luyện Khí Kỳ';
        tt.tang = 1;
        tt.tuVi = 0;
        tt.tuViCanThiet = 100;
        bank.save(); // Lưu vĩnh viễn vào file database.json

        // Giao diện chào mừng nhập môn
        const embedWelcome = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle(`✨ ĐẠI ĐẠO DUYÊN KHỞI - THỨC TỈNH LINH CĂN ✨`)
            .setDescription(
                `Chào mừng đạo hữu **${username}** đã bước chân vào con đường nghịch thiên cải mệnh!\n\n` +
                `🔮 **Trời đất chứng giám, thức tỉnh Linh Căn:**\n` +
                `➔ Bạn sở hữu: **${tt.linhCan}**\n\n` +
                `Bắt đầu hành trình tại: **${tt.canhGioi} - Tầng ${tt.tang}**.\n` +
                `*Hãy gõ lại lệnh \`/tutien\` để mở giao diện Tu Luyện chính thức!*`
            );
        return interaction.editReply({ embeds: [embedWelcome] });
    }

    // GIAO DIỆN PROFILE CHÍNH (Khi đã có nhân vật)
    const embedProfile = new EmbedBuilder()
        .setColor('#1abc9c')
        .setTitle(`🧘 ĐẠO ĐỒ HỒ SƠ - THỜI KHÔNG TU LUYỆN`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
            { name: '👤 Tu Sĩ', value: `<@${userId}>`, inline: true },
            { name: '🔮 Linh Căn', value: `${tt.linhCan}`, inline: true },
            { name: '⚔️ Cảnh Giới', value: `**${tt.canhGioi} (Tầng ${tt.tang}/9)**`, inline: false },
            { name: '✨ Tu Vi Tích Lũy', value: `\`${tt.tuVi} / ${tt.tuViCanThiet}\``, inline: true },
            { name: '🟡 Linh Thạch (Tiền ví)', value: `**$${player.balance.toLocaleString()}**`, inline: true }
        )
        .setDescription(`*Vạn đạo quy tông, muốn đột phá tầng tiếp theo hãy tích lũy đầy Tu Vi!*`);

    // Tạo các nút tương tác (Tạm thời chưa gắn logic, sẽ làm ở bước sau)
    const rowButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tt_luyen_cong').setLabel('🧘 Vận Công Luyện Khí').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('tt_dot_pha').setLabel('⚡ Đột Phá Cảnh Giới').setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({ embeds: [embedProfile], components: [rowButtons] });
}

module.exports = { xemProfile, DANH_SACH_LINH_CAN };