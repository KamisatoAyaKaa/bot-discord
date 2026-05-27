require('dotenv').config(); 
const mongoose = require('mongoose');

// 1. Kết nối tới Cloud Database
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🟢 Đã kết nối thành công tới Cloud Database (MongoDB)!'))
    .catch(err => console.error('🔴 Lỗi kết nối Cloud Database:', err));

// 2. Định nghĩa cấu trúc khung (Schema)
const PlayerSchema = new mongoose.Schema({
    _id: String,
    balance: { type: Number, default: 0 },
    tutien: {
        initialized: { type: Boolean, default: false },
        linhCan: { type: String, default: 'Chưa thức tỉnh' },
        ngoTinh: { type: String, default: 'Chưa đo đạc' },
        theChat: { type: String, default: 'Phàm Thể' },
        khiVan: { type: String, default: 'Bình Thường' },
        canhGioi: { type: String, default: 'Phàm Nhân' },
        tang: { type: Number, default: 0 },
        tuVi: { type: Number, default: 0 },
        tuViCanThiet: { type: Number, default: 100 },
        lastLuyenCong: { type: String, default: null }
    }
});

const PlayerModel = mongoose.model('Player', PlayerSchema);
let memoryCache = {};

module.exports = {
    // SỬA ĐỔI: Chuyển thành hàm async (bất đồng bộ) để ép bot phải chờ tải data trên mây về
    getPlayer: async function(userId) {
        // Nếu trong cache chưa có (khi vừa bật bot), phải sục sạo trên mây tìm kiếm
        if (!memoryCache[userId]) {
            try {
                const doc = await PlayerModel.findById(userId);
                if (doc) {
                    // Nếu tìm thấy data cũ trên mây, nạp ngay vào cache để dùng
                    memoryCache[userId] = doc.toObject();
                } else {
                    // Nếu là người mới hoàn toàn, tạo mới tinh
                    memoryCache[userId] = {
                        _id: userId,
                        balance: 0,
                        tutien: {
                            initialized: false,
                            linhCan: 'Chưa thức tỉnh',
                            ngoTinh: 'Chưa đo đạc',
                            theChat: 'Phàm Thể',
                            khiVan: 'Bình Thường',
                            canhGioi: 'Phàm Nhân',
                            tang: 0,
                            tuVi: 0,
                            tuViCanThiet: 100,
                            lastLuyenCong: null
                        }
                    };
                }
            } catch (err) {
                console.error('🔴 Lỗi khi tải data từ Cloud:', err);
            }
        }
        return memoryCache[userId];
    },

    // Hàm lưu vĩnh viễn dữ liệu từ cache lên Cloud
    save: async function() {
        try {
            for (const userId in memoryCache) {
                const data = memoryCache[userId];
                await PlayerModel.findByIdAndUpdate(userId, data, { upsert: true });
            }
            console.log('💾 [Cloud DB] Đã đồng bộ toàn bộ dữ liệu lên Đám Mây!');
        } catch (error) {
            console.error('🔴 Lỗi khi lưu lên Cloud:', error);
        }
    }
};