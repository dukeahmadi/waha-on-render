const wa = require('@open-wa/wa-automate');
const express = require('express');
const app = express();

const PORT = process.env.PORT || 10000;

let qrCodeData = null;
let waClient = null;

console.log('App starting...'); // لاگ 1: شروع برنامه

// تنظیم و راه‌اندازی open-wa
wa.create({
  useChrome: true,
  executablePath: '/usr/bin/chromium',
  qrTimeout: 0,
  multiDevice: true,
  sessionId: 'session'
})
.then(client => {
  waClient = client;
  console.log('WA Automate client initialized. Calling start(client)...'); // لاگ 2: client open-wa مقداردهی شد
  start(client);

  console.log('Scheduling initial QR code check in 5 seconds...'); // لاگ 3: برنامه‌ریزی اولین چک QR
  setTimeout(checkAndSetQrCode, 5000); 
})
.catch(err => {
  console.error("WA Automate Error during create:", err); // لاگ خطا: اگر در create مشکلی بود
});

function start(client) {
  console.log('WA Automate Client Started and listening for events.'); // لاگ 4: تابع start اجرا شد

  client.onStateChanged((state) => {
    console.log('State changed:', state);
    if (state === 'CONFLICT' || state === 'UNLAUNCHED' || state === 'QR_CODE_NOT_FOUND') {
      console.log(`State requires re-authentication or QR scan: ${state}. Attempting to fetch QR again...`);
      client.forceRefocus();
      setTimeout(checkAndSetQrCode, 2000);
    } else if (state === 'CONNECTED') {
      console.log('WhatsApp client is now CONNECTED!');
      qrCodeData = null;
    } else {
        console.log(`Current state: ${state}`);
    }
  });

  client.onMessage(async message => {
    if (!message.isGroupMsg && !message.isMedia && message.body && message.body.toLowerCase() === 'hi') {
      console.log(`Received 'hi' from ${message.from}`);
      await client.sendText(message.from, 'Hello from your bot! How can I help you today?');
    }
  });

  client.onAddedToGroup((chat) => {
    console.log(`Added to group: ${chat.contact.name} (${chat.id})`);
  });

  client.onDisconnected((reason) => {
    console.log('Client disconnected:', reason);
    qrCodeData = null;
    console.log('Attempting to re-check QR code due to disconnection...');
    setTimeout(checkAndSetQrCode, 5000);
  });
}

async function checkAndSetQrCode() {
  console.log('checkAndSetQrCode: Function called.'); // لاگ 5: تابع Polling اجرا شد

  if (!waClient) {
      console.log('checkAndSetQrCode: Waiting for WA client to initialize...');
      setTimeout(checkAndSetQrCode, 5000);
      return;
  }

  const connectionState = await waClient.getConnectionState();
  if (qrCodeData && connectionState === 'CONNECTED') {
      console.log('checkAndSetQrCode: QR Code already available and client is CONNECTED.');
      return;
  }

  try {
    const qr = await waClient.getQR();
    if (qr && qr !== 'data:image/png;base64,' && qr.length > 50) {
      qrCodeData = qr;
      console.log('QR Code successfully fetched and stored!');
      console.log('You can now visit /qr to scan the QR code.');
    } else {
      console.log('checkAndSetQrCode: QR Code is not ready yet or invalid, retrying in 5 seconds...');
      setTimeout(checkAndSetQrCode, 5000);
    }
  } catch (error) {
    console.error('checkAndSetQrCode: Error fetching QR code:', error.message);
    if (error.message.includes('No current page provided') || error.message.includes('Execution context was destroyed')) {
        console.warn('Browser might be in an unstable state. Forcing refocus...');
        waClient.forceRefocus();
    }
    setTimeout(checkAndSetQrCode, 5000);
  }
}

app.get('/qr', (req, res) => {
  if (qrCodeData) {
    const img = Buffer.from(qrCodeData.replace(/^data:image\/(png|jpeg|jpg);base64,/, ''), 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': img.length
    });
    res.end(img);
  } else {
    res.status(200).send('QR Code not available yet. Please refresh in a few moments or check logs for status.');
  }
});

app.get('/', (req, res) => {
  res.status(200).send(`
    <h1>WAHA Bot Running</h1>
    <p>Visit <a href="/qr">/qr</a> to see the QR code if needed.</p>
    <p>Make sure you have linked your WhatsApp account.</p>
    <p>Check Render logs for detailed status.</p>
    ${qrCodeData ? '<p style="color: green;">QR code data is currently available in memory.</p>' : '<p style="color: red;">QR code data is not yet available in memory.</p>'}
  `);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`); // لاگ 0: شروع سرور Express
  console.log(`Access the QR code at: http://localhost:${PORT}/qr (replace localhost with your Render URL)`);
});
