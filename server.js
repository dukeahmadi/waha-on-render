const wa = require('@open-wa/wa-automate');
const express = require('express');
const app = express();

// تنظیم پورت از متغیر محیطی Render یا پیش‌فرض 10000
const PORT = process.env.PORT || 10000;

let qrCodeData = null; // برای ذخیره داده QR کد
let waClient = null;   // برای نگهداری شیء client واتساپ

// تنظیم و راه‌اندازی open-wa
wa.create({
  // استفاده از مرورگر Chrome که در Dockerfile شما نصب می‌شود
  useChrome: true,
  
  // آرگومان‌های ضروری برای Puppeteer/Chromium در محیط headless مانند Render
  chromiumArgs: [
    '--no-sandbox',           // حیاتی برای اجرا در محیط‌های کانتینری
    '--disable-setuid-sandbox', // حیاتی برای اجرا در محیط‌های کانتینری
    '--disable-dev-shm-usage',  // مهم برای مدیریت حافظه در Render
  ],
  
  // مسیر اجرایی Chromium در سیستم فایل Docker
  executablePath: '/usr/bin/chromium',

  qrTimeout: 0, // ما خودمان مدیریت QR کد را انجام می‌دهیم، پس timeout را غیرفعال می‌کنیم
  multiDevice: true // فعال‌سازی پشتیبانی از Multi Device واتساپ
})
.then(client => {
  waClient = client; // ذخیره شیء client واتساپ برای دسترسی‌های بعدی
  start(client);     // فراخوانی تابع شروع اصلی

  // شروع مکانیزم Polling برای QR کد با یک تأخیر اولیه (5 ثانیه)
  // این تأخیر به WhatsApp Web فرصت می‌دهد تا به طور کامل بارگذاری شود.
  setTimeout(checkAndSetQrCode, 5000); 
})
.catch(err => console.error("WA Automate Error:", err)); // مدیریت خطاهای کلی open-wa

// تابع برای شروع و مدیریت رویدادهای واتساپ
function start(client) {
  console.log('WA Automate Client Started');

  // رصد تغییرات وضعیت واتساپ (مثلاً قطع اتصال، نیاز به اسکن مجدد)
  client.onStateChanged((state) => {
    console.log('State changed:', state);
    // اگر وضعیت به گونه‌ای بود که نیاز به QR کد جدید باشد، دوباره چک می‌کنیم
    if (state === 'CONFLICT' || state === 'UNLAUNCHED' || state === 'QR_CODE_NOT_FOUND') {
      client.forceRefocus(); // مرورگر واتساپ را رفرش می‌کند
      // کمی تأخیر قبل از تلاش مجدد برای QR کد
      setTimeout(checkAndSetQrCode, 2000); 
    }
  });

  // مثال: پاسخ به پیام 'hi'
  client.onMessage(async message => {
    console.log("New message:", message.body);
    if (message.body === 'hi') {
      await client.sendText(message.from, 'Hello from your bot!');
    }
  });

  // **توجه:** تابع client.onqr حذف شده است.
  // به دلیل مشکلات گزارش شده در فراخوانی این رویداد در محیط Render،
  // از روش Polling (تابع checkAndSetQrCode) برای دریافت QR کد استفاده می‌کنیم.

  // رصد اضافه شدن به گروه
  client.onAddedToGroup((chat) => {
    console.log('Added to group:', chat.contact.name);
  });
}

// **تابع کلیدی:** دریافت QR کد به صورت دوره‌ای (Polling)
async function checkAndSetQrCode() {
  // فقط زمانی تلاش می‌کنیم که client واتساپ مقداردهی شده و QR کد هنوز دریافت نشده باشد
  if (waClient && !qrCodeData) { 
    try {
      const qr = await waClient.getQR(); // تلاش برای گرفتن آخرین QR کد
      // اگر QR کد معتبر (غیر از رشته خالی Base64) دریافت شد
      if (qr && qr !== 'data:image/png;base64,') { 
        qrCodeData = qr; // ذخیره QR کد در متغیر سراسری
        console.log('QR Code successfully fetched and stored!'); // پیام موفقیت
      } else {
        // اگر QR کد هنوز آماده نبود، با تأخیر 5 ثانیه دوباره تلاش کن
        console.log('QR Code is not ready yet, retrying in 5 seconds...');
        setTimeout(checkAndSetQrCode, 5000); 
      }
    } catch (error) {
      // در صورت بروز خطا در حین دریافت QR کد، آن را ثبت کرده و دوباره تلاش کن
      console.error('Error fetching QR code:', error.message);
      setTimeout(checkAndSetQrCode, 5000); 
    }
  } else if (!waClient) {
      // اگر client واتساپ هنوز مقداردهی اولیه نشده بود
      console.log('Waiting for WA client to initialize...');
      setTimeout(checkAndSetQrCode, 5000);
  } else if (qrCodeData) {
      // اگر QR کد قبلاً با موفقیت دریافت شده بود، دیگر نیازی به تلاش مجدد نیست
      console.log('QR Code already available.');
  }
}

// مسیر API برای نمایش QR کد به صورت تصویر
app.get('/qr', (req, res) => {
  if (qrCodeData) {
    // تبدیل داده Base64 QR کد به تصویر
    const img = Buffer.from(qrCodeData.replace(/^data:image\/(png|jpeg|jpg);base64,/, ''), 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': img.length
    });
    res.end(img);
  } else {
    // اگر QR کد هنوز آماده نباشد
    res.send('QR Code not available yet. Please refresh in a few moments.');
  }
});

// مسیر اصلی برای نمایش وضعیت ربات
app.get('/', (req, res) => {
  res.send(`
    <h1>WAHA Bot Running</h1>
    <p>Visit <a href="/qr">/qr</a> to see the QR code if needed.</p>
    <p>Make sure you have linked your WhatsApp account.</p>
  `);
});

// راه‌اندازی سرور Express
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access the QR code at: http://localhost:${PORT}/qr (replace localhost with your Render URL)`);
});
