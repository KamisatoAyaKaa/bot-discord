const fs = require('fs');
const path = require('path');

// Đường dẫn đến file lưu dữ liệu (sẽ nằm cùng thư mục với index.js)
const DB_PATH = path.join(__dirname, 'database.json');

// Hàm đọc dữ liệu từ file JSON khi bot chạy lên
function loadData() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('❌ Lỗi khi đọc file database.json:', error);
    }
    return {}; // Trả về đối tượng rỗng nếu chưa có file
}

// Hàm ghi dữ liệu vào file JSON mỗi khi có thay đổi tiền tệ
function saveData(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        console.error('❌ Lỗi khi ghi file database.json:', error);
    }
}

// Tải dữ liệu cũ lên bộ nhớ ngay khi bot khởi động
const userData = loadData(); 

module.exports = {
    // Lấy thông tin ví của người chơi (Tự động khởi tạo nếu là người mới)
    // Lấy thông tin ví và hồ sơ tu tiên của người chơi
    getPlayer: function(userId) {
        // Cấu trúc khởi tạo hoàn chỉnh cho một tu sĩ mới
        const defaultProfile = {
            balance: 0,
            lastDaily: null,
            streak: 0,
            tutien: {
                initialized: false,
                linhCan: 'Chưa thức tỉnh',
                ngoTinh: 'Chưa đo đạc',     // MỚI
                theChat: 'Phàm Thể',        // MỚI
                khiVan: 'Bình Thường',      // MỚI
                canhGioi: 'Phàm Nhân',
                tang: 0,
                tuVi: 0,
                tuViCanThiet: 100,
                lastLuyenCong: null
            }
        };

        // Nếu người chơi hoàn toàn mới (Chưa có trong database)
        if (!userData[userId]) {
            userData[userId] = defaultProfile;
            this.save();
        }
        
        // PHÒNG HỜ: Nếu là người chơi cũ đã có tiền nhưng chưa có mục tu tiên
        if (!userData[userId].tutien) {
            userData[userId].tutien = defaultProfile.tutien;
            this.save();
        }
        
        return userData[userId];
    },

    // Hàm gọi lưu dữ liệu từ các file bên ngoài (như game taixiu.js)
    save: function() {
        saveData(userData);
    },

    // Hàm xử lý Lệnh /daily, /vi và /addtien cho file index.js gọi vào
    handleBankCommands: async function(interaction) {
        const userId = interaction.user.id;
        const username = interaction.user.username;
        const player = this.getPlayer(userId);

        // 1. Xử lý lệnh điểm danh /daily
        if (interaction.commandName === 'daily') {
            await interaction.deferReply();

            const now = new Date();
            const ONE_DAY = 24 * 60 * 60 * 1000;

            if (player.lastDaily) {
                const timePassed = now - new Date(player.lastDaily);

                if (timePassed < ONE_DAY) {
                    const timeLeft = ONE_DAY - timePassed;
                    const hours = Math.floor(timeLeft / (60 * 60 * 1000));
                    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
                    
                    return interaction.editReply({ content: `❌ Bạn đã nhận thưởng hôm nay rồi! Hãy quay lại sau **${hours} giờ ${minutes} phút** nữa nhé.` });
                }

                if (timePassed > ONE_DAY * 2) {
                    player.streak = 0; 
                }
            }

            player.streak += 1;
            const reward = player.streak * 50;
            player.balance += reward;
            player.lastDaily = now.toISOString();

            // LƯU VÀO FILE CỨNG
            saveData(userData); 

            return interaction.editReply(`📆 **${username}** đã điểm danh ngày thứ **${player.streak}** liên tiếp!\n💰 Bạn nhận được: **$${reward.toLocaleString()}** (Ví hiện tại: **$${player.balance.toLocaleString()}**)`);
        }

        // 2. Xử lý lệnh xem ví /vi
        if (interaction.commandName === 'vi') {
            await interaction.deferReply();
            return interaction.editReply(`💰 Tài khoản của **${username}** hiện có: **$${player.balance.toLocaleString()}**`);
        }

        // 3. LỆNH ADMIN: /ADDTIEN
        if (interaction.commandName === 'addtien') {
            const app = await interaction.client.application.fetch();
            const ownerId = app.owner ? app.owner.id : null;

            if (userId !== ownerId) {
                return interaction.reply({ 
                    content: '❌ Bạn không có quyền hạn Admin để sử dụng lệnh tối cao này!', 
                    ephemeral: true 
                });
            }

            const nguoiNhan = interaction.options.getUser('nguoi_nhan');
            const soTien = interaction.options.getInteger('so_tien');

            if (soTien <= 0) {
                return interaction.reply({ content: '❌ Số tiền add phải lớn hơn 0!', ephemeral: true });
            }

            const targetId = nguoiNhan.id; 
            const targetPlayer = this.getPlayer(targetId);
            targetPlayer.balance += soTien;

            // LƯU VÀO FILE CỨNG
            saveData(userData); 

            return interaction.reply(`👑 **ADMIN CHEAT TOOL:** Đã bơm thành công **+$${soTien.toLocaleString()}** vào tài khoản của <@${targetId}>!`);
        }
    }
};