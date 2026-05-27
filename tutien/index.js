const { xemProfile } = require('./profile.js');

module.exports = {
    handleTuTien: async function(interaction) {
        // 1. Khi người chơi gõ lệnh gạch chéo /tutien
        if (interaction.isChatInputCommand() && interaction.commandName === 'tutien') {
            await interaction.deferReply(); // Xin thêm thời gian từ Discord
            return xemProfile(interaction);
        }

        // (Các nút bấm vận công và đột phá sẽ được thêm vào đây ở các bước sau)
    }
};
