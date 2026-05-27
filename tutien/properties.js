// Hệ thuộc tính Linh Căn
const HE_LINH_CAN = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];

// 1. LINH CĂN: Tăng % tốc độ tích lũy tu vi
const PHAM_CHAT_LINH_CAN = [
    { name: '伪 Phế Linh Căn (Bốn-Năm Hệ tạp nham)', rate: 45, bonusTuVi: 0.0, count: [4, 5] },  // +0% (Tốc độ gốc)
    { name: '杂 Tạp Linh Căn (Ba Hệ hỗn hợp)', rate: 30, bonusTuVi: 0.3, count: [3, 3] },      // +30% Tu vi
    { name: '双 Song Linh Căn (Hai Hệ tinh thuần)', rate: 18, bonusTuVi: 0.8, count: [2, 2] },     // +80% Tu vi
    { name: '天 Thiên Linh Căn (Duy nhất Một Hệ trời ban)', rate: 6, bonusTuVi: 1.8, count: [1, 1] }, // +180% Tu vi
    { name: '圣 Thánh Linh Căn (Ẩn chứa Quy Tắc đại đạo)', rate: 1, bonusTuVi: 3.5, count: [1, 1] } // +350% Tu vi
];

// 2. NGỘ TÍNH: Tăng % tốc độ tích lũy tu vi + Tăng tỷ lệ Đột Phá
const NGO_TINH = [
    { name: '钝 Kém (Đầu óc trì trệ)', rate: 40, bonusTuVi: -0.2, breakBonus: -5 },            // -20% Tốc độ tu luyện
    { name: '普 Bình Thường (Tư chất đại chúng)', rate: 45, bonusTuVi: 0.0, breakBonus: 0 },    // +0%
    { name: '🪶 Thiên Tài (Nhìn một thấu mười)', rate: 12, bonusTuVi: 0.4, breakBonus: 8 },    // +40% Tu vi
    { name: '👁️ Yêu Nghiệt (Nhìn thấu bản chất thiên địa)', rate: 3, bonusTuVi: 1.0, breakBonus: 18 } // +100% Tu vi
];

// 3. THỂ CHẤT ĐẶC BIỆT: Tăng % tốc độ tích lũy tu vi + Tăng tỷ lệ Đột Phá ẩn
const THE_CHAT = [
    { name: 'Phàm Thể (Không có thể chất đặc biệt)', rate: 70, bonusTuVi: 0.0, breakBonus: 0 },
    { name: '🔥 Cửu Dương Dương Thể (Hợp tu hỏa công)', rate: 10, bonusTuVi: 0.2, breakBonus: 0 }, // +20% Tu vi
    { name: '❄️ Huyền Âm Lãnh Thể (Kinh mạch băng hàn)', rate: 10, bonusTuVi: 0.2, breakBonus: 0 }, // +20% Tu vi
    { name: '🛡️ Hoang Cổ Thánh Thể (Thần thể viễn cổ)', rate: 7, bonusTuVi: 0.5, breakBonus: 5 },   // +50% Tu vi
    { name: '🌌 Tiên Thiên Thánh Thể Đạo Thai (Đỉnh cấp)', rate: 3, bonusTuVi: 1.5, breakBonus: 10 } // +150% Tu vi
];

// 4. KHÍ VẬN: Quyết định vận may khi Đột Phá đối mặt Lôi Kiếp
const KHI_VAN = [
    { name: '📉 Suýt Nữa Thì Đầu Thai (Xui xẻo tột cùng)', rate: 10, breakBonus: -15 },
    { name: '⚖️ Bình Thường (Không may không rủi)', rate: 65, breakBonus: 0 },
    { name: '🍀 Hồng Phúc Tề Thiên (Khí vận gia thân)', rate: 20, breakBonus: 10 },
    { name: '👑 Thiên Mệnh Chi Tử (Nhân vật chính hào quang)', rate: 5, breakBonus: 25 }
];

// Các hàm bổ trợ bốc quẻ ngẫu nhiên (Giữ nguyên cấu trúc cũ của bạn)
function rollProperty(array) {
    const rand = Math.random() * 100;
    let sum = 0;
    for (const item of array) {
        sum += item.rate;
        if (rand <= sum) return item;
    }
    return array[0];
}

function generateLinhCan() {
    const phamChat = rollProperty(PHAM_CHAT_LINH_CAN);
    const heXoat = [...HE_LINH_CAN].sort(() => 0.5 - Math.random());
    const minCount = phamChat.count[0];
    const maxCount = phamChat.count[1];
    const actualCount = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
    const heChon = heXoat.slice(0, actualCount).join(' • ');
    return `${phamChat.name} [${heChon}]`;
}

function thucTinhSoMenh() {
    return {
        linhCan: generateLinhCan(),
        ngoTinh: rollProperty(NGO_TINH).name,
        theChat: rollProperty(THE_CHAT).name,
        khiVan: rollProperty(KHI_VAN).name
    };
}

module.exports = { thucTinhSoMenh, PHAM_CHAT_LINH_CAN, NGO_TINH, THE_CHAT, KHI_VAN };