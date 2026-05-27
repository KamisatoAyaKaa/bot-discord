const bank = require('../bank.js');
const { PHAM_CHAT_LINH_CAN, NGO_TINH, THE_CHAT } = require('./properties.js');

async function handleTuLuyen(interaction) {
    const userId = interaction.user.id;
    const player = bank.getPlayer(userId);
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
    tt.tuVi += tuViNhanDuoc;
    tt.lastLuyenCong = now.toISOString(); // Lưu lại thời gian vừa tu luyện
    bank.save(); // Ghi trực tiếp xuống file database.json

    return interaction.reply({
        content: `🧘 **Vận công thành công!** Đạo hữu nhập định hấp thu tinh hoa trời đất, nhận được **+${tuViNhanDuoc} Tu Vi**. (Hiện có: \`${tt.tuVi} / ${tt.tuViCanThiet}\`)`,
        ephemeral: true
    });
}

module.exports = { handleTuLuyen };