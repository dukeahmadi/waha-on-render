const wa = require('@open-wa/wa-automate');
const express = require('express');
const app = express();

// پورت را از متغیر محیطی Render یا به صورت پیش‌فرض 8000 (یا 10000) تنظیم کنید.
// Render معمولاً پورت 10000 را پیشنهاد می‌دهد.
const PORT = process.env.PORT || 10000; 

let qrCodeData = null; // متغیری برای نگهداری داده QR کد به صورت سراسری
let waClient = null;   // متغیری برای نگهداری آبجکت client واتساپ

// شروع به ساخت client واتساپ
wa.create({
  // استفاده از Chrome نصب شده در سیستم (همانطور که Dockerfile شما آن را نصب می‌کند)
  useChrome: true, 
  
  // آرگومان‌های ضروری Chromium برای محیط Docker و Headless
  chromiumArgs: [
    '--no-sandbox',           // ضروری برای اجرا در Docker
    '--disable-setuid-sandbox', // ضروری برای اجرا در Docker
    '--disable-dev-shm-usage',  // ضروری برای محدودیت‌های حافظه در محیط‌های ابری
    // آرگومان‌های کمتر ضروری که قبلاً مشکل‌ساز بودند، حذف شده‌اند.
  ],
  
  // مسیر اجرایی Chromium در Dockerfile شما
  executablePath: '/usr/bin/chromium', 

  qrTimeout: 0, // زمان‌بندی QR کد را غیرفعال می‌کند، ما خودمان آن را مدیریت می‌کنیم.
  multiDevice: true // پشتیبانی از Multi Device واتساپ
})
.then(client => {
  waClient = client; // آبجکت client را در متغیر سراسری ذخیره می‌کنیم
  start(client);     // تابع start را با client فراخوانی می‌کنیم
  
  // 5 ثانیه تأخیر قبل از شروع اولین تلاش برای گرفتن QR کد
  // این زمان برای اطمینان از بارگذاری کامل WhatsApp Web است.
  setTimeout(checkAndSetQrCode, 5000); 
})
.catch(err => console.error("WA Automate Error:", err)); // مدیریت خطاهای کلی open-wa

// تابع اصلی برای مدیریت رویدادهای واتساپ
function start(client) {
  console.log('WA Automate Client Started');

  // رویداد تغییر وضعیت واتساپ
  client.onStateChanged((state) => {
    console.log('State changed:', state);
    // اگر واتساپ نیاز به احراز هویت مجدد داشت (مثلاً Conflict) یا QR کد منقضی شد،
    // دوباره تلاش می‌کنیم تا QR کد را بگیریم.
    if (state === 'CONFLICT' || state === 'UNLAUNCHED' || state === 'QR_CODE_NOT_FOUND') {
      client.forceRefocus(); // واتساپ را مجبور به رفرش می‌کند
      setTimeout(checkAndSetQrCode, 2000); // 2 ثانیه بعد دوباره QR کد را چک کن
    }
  });

  // رویداد دریافت پیام
  client.onMessage(async message => {
    console.log("New message:", message.body);
    if (message.body === 'hi') {
      await client.sendText(message.from, 'Hello from your bot!');
    }
  });

  // ***** مهم: تابع client.onqr حذف شده است. *****
  // به دلیل اینکه در محیط Render به درستی فراخوانی نمی‌شد،
  // از روش checkAndSetQrCode برای گرفتن QR کد استفاده می‌کنیم.

  // رویداد اضافه شدن به گروه
  client.onAddedToGroup((chat) => {
    console.log('Added to group:', chat.contact.name);
  });
}

// تابع جدید برای چک کردن و تنظیم QR کد به صورت دوره‌ای (Polling)
async function checkAndSetQrCode() {
  // فقط اگر client واتساپ آماده بود و QR کد هنوز گرفته نشده بود، ادامه بده
  if (waClient && !qrCodeData) { 
    try {
      const qr = await waClient.getQR(); // تلاش برای گرفتن QR کد از client واتساپ
      // اگر QR کد گرفته شد و خالی نبود (有时候 open-wa یک رشته خالی برمی‌گرداند)
      if (qr && qr !== 'data:image/png;base64,') { 
        qrCodeData = qr; // داده QR کد را در متغیر سراسری ذخیره کن
        console.log('QR Code successfully fetched and stored!'); // لاگ موفقیت‌آمیز
      } else {
        // اگر QR کد هنوز آماده نبود، دوباره تلاش کن
        console.log('QR Code is not ready yet, retrying in 5 seconds...');
        setTimeout(checkAndSetQrCode, 5000); // 5 ثانیه صبر کن و دوباره تابع را فراخوانی کن
      }
    } catch (error) {
      // در صورت بروز خطا در حین گرفتن QR کد، آن را ثبت کرده و دوباره تلاش کن
      console.error('Error fetching QR code:', error.message);
      setTimeout(checkAndSetQrCode, 5000); // 5 ثانیه صبر کن و دوباره تلاش کن
    }
  } else if (!waClient) {
      // اگر client واتساپ هنوز مقداردهی نشده بود، صبر کن.
      console.log('Waiting for WA client to initialize...');
      setTimeout(checkAndSetQrCode, 5000);
  } else if (qrCodeData) {
      // اگر QR کد قبلاً گرفته شده بود، دیگر نیازی به تلاش مجدد نیست.
      console.log('QR Code already available.');
  }
}

// مسیر Express برای نمایش QR کد
app.get('/qr', (req, res) => {
  if (qrCodeData) {
    // اگر داده QR کد موجود باشد، آن را به عنوان تصویر PNG نمایش بده
    const img = Buffer.from(qrCodeData.replace(/^data:image\/(png|jpeg|jpg);base64,/, ''), 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': img.length
    });
    res.end(img);
  } else {
    // اگر QR کد هنوز موجود نیست، یک پیغام نمایش بده
    res.send('QR Code not available yet. Please refresh in a few moments.');
  }
});

// مسیر اصلی سرور (صفحه خوش آمدگویی)
app.get('/', (req, res) => {
  res.send(`
    <h1>WAHA Bot Running</h1>
    <p>Visit <a href="/qr">/qr</a> to see the QR code if needed.</p>
    <p>Make sure you have linked your WhatsApp account.</p>
  `);
});

// سرور Express را روی پورت تعیین شده (یا پورت اختصاص داده شده توسط Render) گوش بده
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access the QR code at: http://localhost:${PORT}/qr (replace localhost with your Render URL)`);
});
