const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); 

const client = new Client({ 
    authStrategy: new LocalAuth(),
    puppeteer: {
        // Points to standard Windows Google Chrome
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code above with your WhatsApp app');
});

client.on('ready', () => {
    console.log('✅ WhatsApp API is ready and connected!');
});

app.post('/api/send', async (req, res) => {
    const { number, message } = req.body;
    try {
        const chatId = `${number}@c.us`;
        await client.sendMessage(chatId, message);
        res.status(200).json({ success: true, msg: 'Message sent' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

client.initialize();

app.listen(3001, () => console.log('🚀 WhatsApp API listening on http://localhost:3001'));