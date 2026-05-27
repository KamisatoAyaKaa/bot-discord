// Hệ thuộc tính Linh Căn
const HE_LINH_CAN = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];

// Phẩm chất Linh Căn (Tỷ lệ % xuất hiện và Hệ số buff tốc độ tu luyện)
const PHAM_CHAT_LINH_CAN = [
    { name: '伪 Phế Linh Căn (Bốn-Năm Hệ tạp nham)', rate: 45, buff: 1.0, count: [4, 5] },
    { name: '杂 Tạp Linh Căn (Ba Hệ hỗn hợp)', rate: 30, buff: 1.5, count: [3, 3] },
    { name: '双 Song Linh Căn (Hai Hệ tinh thuần)', rate: 18, buff: 2.5, count: [2, 2] },
    { name: '天 Thiên Linh Căn (Duy nhất Một Hệ trời ban)', rate: 6, buff: 4.0, count: [1, 1] },
    { name: '圣 Thánh Linh Căn (Ẩn chứa Quy Tắc đại đạo)', rate: 1, buff: 6.5, count: [1, 1] }
];

// Ngộ Tính (Ảnh hưởng trực tiếp đến tỷ lệ đột phá thành công hoặc ngộ đạo)
const NGO_TINH = [
    { name: '钝 Kém (Đầu óc trì trệ, khó ngộ đạo)', rate: 40, breakBonus: -5 },
    { name: '普 Bình Thường (Tư chất đại chúng)', rate: 45, breakBonus: 0 },
    { name: '🪶 Thiên Tài (Nhìn một thấu mười)', rate: 12, breakBonus: 8 },
    { name: '👁️ Yêu Nghiệt (Nhìn thấu bản chất thiên địa)', rate: 3, breakBonus: 18 }
];

// Thể Chất Đặc Biệt (Hào quang ẩn, buff chỉ số đặc biệt)
const THE_CHAT = [
    { name: 'Phàm Thể (Không có thể chất đặc biệt)', rate: 70, buffText: 'Không có buff ẩn' },
    { name: '🔥 Cửu Dương Dương Thể (Hợp tu hỏa công)', rate: 10, buffText: '+15% Tu vi khi vận công hệ Hỏa' },
    { name: '❄️ Huyền Âm Lãnh Thể (Kinh mạch băng hàn)', rate: 10, buffText: '+15% Tu vi khi vận công hệ Thủy' },
    { name: '🛡️ Hoang Cổ Thánh Thể (Thần thể viễn cổ)', rate: 7, buffText: 'Giảm 50% tu vi tổn thất khi đột phá thất bại' },
    { name: '🌌 Tiên Thiên Thánh Thể Đạo Thai (Đỉnh cấp)', rate: 3, buffText: 'X3 tốc độ tu luyện, +10% tỷ lệ đột phá' }
];

// Khí Vận (Vận may ngẫu nhiên, ảnh hưởng xúc xắc lôi kiếp)
const KHI_VAN = [
    { name: '📉 Suýt Nữa Thì Đầu Thai (Xui xẻo tột cùng)', rate: 10, luckBonus: -15 },
    { name: '⚖️ Bình Thường (Không may không rủi)', rate: 65, luckBonus: 0 },
    { name: '🍀 Hồng Phúc Tề Thiên (Khí vận gia thân)', rate: 20, luckBonus: 10 },
    { name: '👑 Thiên Mệnh Chi Tử (Nhân vật chính hào quang)', rate: 5, luckBonus: 25 }
];

// Hàm thuật toán bốc quẻ ngẫu nhiên theo tỷ lệ %
function rollProperty(array) {
    const rand = Math.random() * 100;
    let sum = 0;
    for (const item of array) {
        sum += item.rate;
        if (rand <= sum) return item;
    }
    return array[0];
}

// Hàm sinh ra Linh Căn kết hợp Hệ (Ví dụ: Thiên Linh Căn - Hệ Hỏa)
function generateLinhCan() {
    const phamChat = rollProperty(PHAM_CHAT_LINH_CAN);
    // Trộn ngẫu nhiên danh sách Hệ để bốc
    const heXoat = [...HE_LINH_CAN].sort(() => 0.5 - Math.random());
    // Lấy số lượng hệ dựa trên phẩm chất (Phế lấy 4-5 hệ, Thiên lấy 1 hệ)
    const minCount = phamChat.count[0];
    const maxCount = phamChat.count[1];
    const actualCount = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
    
    const heChon = heXoat.slice(0, actualCount).join(' • ');
    return `${phamChat.name} [${heChon}]`;
}

// Hàm tổng hợp để xuất ra cho nhân vật mới
function thucTinhSoMenh() {
    return {
        linhCan: generateLinhCan(),
        ngoTinh: rollProperty(NGO_TINH).name,
        theChat: rollProperty(THE_CHAT).name,
        khiVan: rollProperty(KHI_VAN).name
    };
}

module.exports = { thucTinhSoMenh, NGO_TINH, KHI_VAN, THE_CHAT };