const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const dotenv = require('dotenv');
const { Configuration, OpenAIApi } = require('openai');

dotenv.config();

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({ auth: state });

    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (!text) return;

        if (text.startsWith('/ai')) {
            const prompt = text.replace('/ai', '').trim();
            if (prompt.length === 0) {
                await sock.sendMessage(msg.key.remoteJid, { text: 'Please enter a prompt after /ai' });
                return;
            }
            try {
                const completion = await openai.createChatCompletion({
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: prompt }],
                });

                await sock.sendMessage(msg.key.remoteJid, { text: completion.data.choices[0].message.content });
            } catch (error) {
                console.error(error);
                await sock.sendMessage(msg.key.remoteJid, { text: 'Error fetching response from OpenAI.' });
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
