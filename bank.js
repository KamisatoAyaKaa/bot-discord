const mongoose = require('mongoose');

// 1. Kết nối tới cơ sở dữ liệu Đám mây MongoDBAtlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🟢 Đã kết nối thành công tới Cloud Database (MongoDB)!'))
    .catch(err => console.error('🔴 Lỗi kết nối Cloud Database:', err));

// 2. Định nghĩa cấu trúc khung (Schema) lưu trữ cho Tu Sĩ
const PlayerSchema = new mongoose.Schema({
    _id: String, // Đây chính là ID Discord của người chơi
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

// Tạo Model để tương tác với bảng "players"
const PlayerModel = mongoose.model('Player', PlayerSchema);

// Bộ nhớ đệm (Cache) để bot đọc ghi siêu nhanh mà không bị nghẽn mạng Discord
let memoryCache = {};

module.exports = {
    // Hàm lấy thông tin người chơi (Nếu chưa có trên mây, nó sẽ tự tạo mới trong cache)
    getPlayer: function(userId) {
        if (!memoryCache[userId]) {
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
            // Thử tìm xem trên Đám mây có dữ liệu cũ chưa để nạp đè vào cache
            PlayerModel.findById(userId).then(doc => {
                if (doc) memoryCache[userId] = doc.toObject();
            });
        }
        return memoryCache[userId];
    },

    // Hàm đồng bộ và lưu vĩnh viễn dữ liệu của TẤT CẢ mọi người lên đám mây Cloud
    save: async function() {
        try {
            for (const userId in memoryCache) {
                const data = memoryCache[userId];
                await PlayerModel.findByIdAndUpdate(userId, data, { upsert: true });
            }
            console.log('💾 [Cloud DB] Đã đồng bộ toàn bộ dữ liệu tu tiên lên Đám Mây thành công!');
        } catch (error) {
            console.error('🔴 Lỗi khi đồng bộ lên Cloud:', error);
        }
    }
};