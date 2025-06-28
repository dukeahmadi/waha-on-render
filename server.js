const wa = require('@open-wa/wa-automate');
const express = require('express');
const app = express();

// Render.com پورت را از طریق متغیر محیطی PORT ارسال می‌کند
const PORT = process.env.PORT || 8000; // از پورت Render استفاده کنید، اگر تعریف نشده بود، 8000

let qrCodeData = null; // برای نگهداری داده‌های QR کد

wa.create({
  // اگر قبلاً آرگومان‌های Chromium را اینجا تنظیم کرده‌اید، مطمئن شوید که --no-sandbox وجود دارد
  // و فقط آرگومان‌هایی که برای محیط Docker ضروری هستند را نگه دارید.
  //openBrowser: false, // برای محیط headless (سرور) مرورگر رو باز نمیکنه
  //autoClose: false,
  // این آرگومان‌ها برای ران شدن در محیط Docker/Linux ضروری هستند:
  chromiumArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--single-process', // برای کاهش مصرف منابع در برخی محیط ها
    '--disable-extensions',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gl-drawing-for-tests'
  ],
  // تنظیمات مسیر Chromium: (اگر قبلاً در Dockerfile تنظیم شده، شاید اینجا نیاز نباشد)
  // executablePath: process.env.CHROME_PATH || '/usr/bin/chromium', // یا /usr/bin/google-chrome
  // این دو خط را اضافه کنید تا open-wa QR کد را به ما برگرداند
  qrTimeout: 0, // زمان نامحدود برای QR کد
  multiDevice: true // برای سازگاری با واتساپ وب جدید
})
.then(client => start(client))
.catch(err => console.error("WA Automate Error:", err));

function start(client) {
  console.log('WA Automate Client Started');

  // وقتی QR کد تولید شد، آن را ذخیره کرده و در کنسول هم چاپ کن
  client.onStateChanged((state) => {
    console.log('State changed:', state);
    if (state === 'CONFLICT' || state === 'UNLAUNCHED') client.forceRefocus();
  });

  client.onMessage(async message => {
    console.log("New message:", message.body);
    if (message.body === 'hi') {
      await client.sendText(message.from, 'Hello from your bot!');
    }
  });

  // **این قسمت بسیار مهم است:**
  // وقتی QR کد آماده شد، آن را در متغیر ذخیره کن
  client.onAnyMessage((message) => {
    // این فقط یک placeholder برای onAnyMessage است، منطق اصلی QR code در onStateChanged یا onConnected/onDisconnected
    // یا زمانی که client.onqr is triggered در open-wa
  });

  // This is the correct way to get the QR code from open-wa
  client.onqr((qrCode) => {
    console.log('QR Code received!');
    qrCodeData = qrCode; // ذخیره QR کد
    // اگر می‌خواهید در کنسول هم نمایش داده شود:
    // console.log(qrCode);
  });

  client.onAddedToGroup((chat) => {
    console.log('Added to group:', chat.contact.name);
  });
}

// **تنظیم مسیر برای نمایش QR کد**
app.get('/qr', (req, res) => {
  if (qrCodeData) {
    // اگر داده QR کد موجود باشد، آن را به عنوان تصویر Base64 نمایش بده
    // open-wa QR کد را به صورت Base64 string برمی‌گرداند.
    const img = Buffer.from(qrCodeData.replace(/^data:image\/(png|jpeg|jpg);base64,/, ''), 'base64');

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': img.length
    });
    res.end(img);
  } else {
    res.send('QR Code not available yet. Please refresh in a few moments.');
  }
});

// مسیر اصلی سرور
app.get('/', (req, res) => {
  res.send(`
    <h1>WAHA Bot Running</h1>
    <p>Visit <a href="/qr">/qr</a> to see the QR code if needed.</p>
    <p>Make sure you have linked your WhatsApp account.</p>
  `);
});

// سرور Express را روی پورت تعیین شده (یا Render) گوش بده
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access the QR code at: http://localhost:${PORT}/qr (replace localhost with your Render URL)`);
});
