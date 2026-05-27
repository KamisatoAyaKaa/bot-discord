const bank = require('../bank.js');
const { DANH_SACH_LINH_CAN } = require('./profile.js');

// Danh sách 11 Đại Cảnh Giới đồng bộ 100% theo ảnh image_070ecb.png
const CAC_CANH_GIOI = [
    'Phàm Nhân',   // Cấp 1
    'Luyện Khí',   // Cấp 2
    'Trúc Cơ',     // Cấp 3
    'Kim Đan',     // Cấp 4
    'Nguyên Anh',  // Cấp 5
    'Hóa Thần',    // Cấp 6
    'Luyện Hư',    // Cấp 7
    'Hợp Thể',     // Cấp 8
    'Đại Thừa',    // Cấp 9
    'Độ Kiếp',     // Cấp 10
    'Chân Tiên'    // Cấp 11
];

async function handleDotPha(interaction) {
    const userId = interaction.user.id;
    const player = bank.getPlayer(userId);
    const tt = player.tutien;

    // 1. Kiểm tra điều kiện Tu Vi
    if (tt.tuVi < tt.tuViCanThiet) {
        return interaction.reply({
            content: `❌ **Cơ duyên chưa đủ!** Đạo hữu hiện mới tích lũy được \`${tt.tuVi} / ${tt.tuViCanThiet}\` Tu Vi. Hãy chịu khó vận công hấp thu linh khí thêm!`,
            ephemeral: true
        });
    }

    // Đặc cách cho Phàm Nhân: Lần đầu đột phá sẽ nhảy thẳng lên Luyện Khí Tầng 1 với tỉ lệ 100%
    if (tt.canhGioi === 'Phàm Nhân') {
        tt.canhGioi = 'Luyện Khí';
        tt.tang = 1;
        tt.tuVi = 0;
        tt.tuViCanThiet = 150; // Mức tu vi cần thiết tiếp theo
        bank.save();
        return interaction.reply(`✨ **THỨC TỈNH ĐẠO CĂN!** Đạo hữu <@${userId}> đã thoát thai hoán cốt, chính thức bước vào cảnh giới **Luyện Khí - Tầng 1**, mở ra con đường tu chân nghịch thiên! 🎉`);
    }

    // 2. Tính toán tỉ lệ thành công dựa trên số Tầng hiện tại (Tầng càng cao lôi kiếp càng dữ dội)
    let tyLeGoc = 80; // Tầng 1 -> 3
    if (tt.tang >= 4 && tt.tang <= 6) tyLeGoc = 55; // Tầng 4 -> 6
    if (tt.tang >= 7) tyLeGoc = 35; // Tầng 7 -> 9 (Cực kỳ nguy hiểm)

    // Bonus tỉ lệ may mắn từ phẩm chất Linh Căn đã bốc quẻ
    let bonusLinhCan = 0;
    if (tt.linhCan.includes('Chân')) bonusLinhCan = 5;
    if (tt.linhCan.includes('Biến Dị')) bonusLinhCan = 12;
    if (tt.linhCan.includes('Thiên')) bonusLinhCan = 25;

    const tyLeTong = Math.min(tyLeGoc + bonusLinhCan, 95); // Tối đa 95% thành công, luôn có 5% rủi ro thiên kiếp
    const xucXac = Math.random() * 100;

    // 3. Xử lý kết quả Lôi Kiếp Đột Phá
    if (xucXac <= tyLeTong) {
        // THÀNH CÔNG 🎉
        tt.tuVi = 0; // Reset tu vi của tầng cũ về 0

        if (tt.tang < 9) {
            // Tăng tầng nhỏ (Ví dụ: Luyện Khí Tầng 1 -> Tầng 2)
            tt.tang += 1;
            // Độ khó tăng dần theo tầng: Tầng càng cao thì yêu cầu tu vi tầng sau tăng 40%
            tt.tuViCanThiet = Math.floor(tt.tuViCanThiet * 1.4); 
            bank.save();
            return interaction.reply(`⚡ **LINH KHÍ XUNG THIÊN!** Đạo hữu <@${userId}> đột phá thành công, thăng tiến lên **${tt.canhGioi} - Tầng ${tt.tang}**! Đan điền mở rộng! 🎉`);
        } else {
            // Lên Đại Cảnh Giới mới khi đang ở Tầng 9 (Ví dụ: Luyện Khí Tầng 9 -> Trúc Cơ Tầng 1)
            const indexHienTai = CAC_CANH_GIOI.indexOf(tt.canhGioi);
            
            if (indexHienTai < CAC_CANH_GIOI.length - 1) {
                const canhGioiMoi = CAC_CANH_GIOI[indexHienTai + 1];
                tt.canhGioi = canhGioiMoi;
                tt.tang = 1;
                // Công thức tính Tu Vi cần thiết cho Đại cảnh giới mới: Càng lên cao càng tốn thời gian
                tt.tuViCanThiet = (indexHienTai + 2) * 400; 
                bank.save();
                return interaction.reply(`🌌 **KHOẢNG KHÔNG CHẤN ĐỘNG - PHI THĂNG THÀNH CÔNG!** Chúc mừng đại năng <@${userId}> đã vượt qua cửu thiên lôi phạt, tiến vào đại cảnh giới mới: ✨ **${tt.canhGioi} - Tầng 1**! ✨`);
            } else {
                // Đạt đỉnh Chân Tiên Tầng 9
                return interaction.reply({ 
                    content: `👑 **ĐỘC CÔ CẦU BẠI!** Đạo hữu đã đạt tới cảnh giới tối cao **Chân Tiên - Tầng 9**, đứng đầu vạn giới, thọ ngang trời đất!`, 
                    ephemeral: true 
                });
            }
        }
    } else {
        // THẤT BẠI ❌ (Tẩu hỏa nhập ma)
        const tuViTonThat = Math.floor(tt.tuVi * 0.25); // Tổn thất 25% số tu vi đang có
        tt.tuVi -= tuViTonThat;
        bank.save();
        return interaction.reply(`💥 **THIÊN KIẾP ĐÁNH PHÁ!** Đạo hữu <@${userId}> đột phá thất bại do tâm ma hỗn loạn, kinh mạch nghịch chuyển bị tiêu hao **-${tuViTonThat} Tu Vi**! Chúc đạo hữu may mắn lần sau.`);
    }
}

module.exports = { handleDotPha };