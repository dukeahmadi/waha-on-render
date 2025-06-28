const wa = require('@open-wa/wa-automate');
const express = require('express');
const app = express();

const PORT = process.env.PORT || 8000;
let qrCodeData = null; // متغیر برای نگهداری داده QR کد

let waClient = null; // متغیری برای نگهداری آبجکت client

wa.create({
  useChrome: true,
  chromiumArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
  ],
  executablePath: '/usr/bin/chromium',
  qrTimeout: 0,
  multiDevice: true
})
.then(client => {
  waClient = client; // آبجکت client را در متغیر سراسری ذخیره کن
  start(client);
  // شروع به تلاش برای گرفتن QR کد بلافاصله پس از راه‌اندازی client
  // کمی تاخیر اولیه برای اطمینان از آماده بودن WhatsApp
  setTimeout(checkAndSetQrCode, 5000); // 5 ثانیه صبر کن، بعد شروع به چک کردن QR کن
})
.catch(err => console.error("WA Automate Error:", err));


function start(client) {
  console.log('WA Automate Client Started');

  client.onStateChanged((state) => {
    console.log('State changed:', state);
    // اگر به هر دلیلی وضعیت تغییر کرد و QR کد نیاز شد، دوباره چک کن
    if (state === 'CONFLICT' || state === 'UNLAUNCHED' || state === 'QR_CODE_NOT_FOUND') {
      client.forceRefocus();
      // اگر QR کد جدیدی نیاز بود، دوباره شروع به چک کردن کن
      setTimeout(checkAndSetQrCode, 2000); 
    }
  });

  client.onMessage(async message => {
    console.log("New message:", message.body);
    if (message.body === 'hi') {
      await client.sendText(message.from, 'Hello from your bot!');
    }
  });

  // **این خط را حذف یا کامنت کنید، دیگر به آن نیاز نداریم:**
  // client.onqr((qrCode) => {
  //   console.log('QR Code received!');
  //   qrCodeData = qrCode;
  //   console.log('QR code data stored successfully.');
  // });

  client.onAddedToGroup((chat) => {
    console.log('Added to group:', chat.contact.name);
  });
}

// **تابع جدید برای چک کردن و تنظیم QR کد به صورت دوره‌ای**
async function checkAndSetQrCode() {
  if (waClient && !qrCodeData) { // فقط اگر client آماده بود و QR کد هنوز گرفته نشده بود
    try {
      const qr = await waClient.getQR(); // تلاش برای گرفتن QR کد
      if (qr && qr !== 'data:image/png;base64,') { // مطمئن شو که QR خالی نیست
        qrCodeData = qr;
        console.log('QR Code successfully fetched and stored!');
      } else {
        console.log('QR Code is not ready yet, retrying...');
        setTimeout(checkAndSetQrCode, 5000); // 5 ثانیه صبر کن و دوباره تلاش کن
      }
    } catch (error) {
      console.error('Error fetching QR code:', error.message);
      // اگر خطایی رخ داد، دوباره تلاش کن
      setTimeout(checkAndSetQrCode, 5000);
    }
  } else if (!waClient) {
      console.log('Waiting for WA client to initialize...');
      setTimeout(checkAndSetQrCode, 5000);
  } else if (qrCodeData) {
      console.log('QR Code already available.');
  }
}


app.get('/qr', (req, res) => {
  if (qrCodeData) {
    // اگر داده QR کد موجود باشد، آن را به عنوان تصویر Base64 نمایش بده
    const img = Buffer.from(qrCodeData.replace(/^data:image\/(png|jpeg|jpg);base64,/, ''), 'base64');

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': img.length
    });
    res.end(img);
  } else {
    // اگر QR کد هنوز موجود نیست، درخواست دهنده را به سمت رفرش هدایت کن
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
