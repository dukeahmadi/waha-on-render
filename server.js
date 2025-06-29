const wa = require('@open-wa/wa-automate');
const express = require('express');
const app = express();

// تنظیم پورت از متغیر محیطی Render یا پیش‌فرض 10000
const PORT = process.env.PORT || 10000;

let qrCodeData = null; // برای ذخیره داده QR کد به صورت Base64
let waClient = null;   // برای نگهداری شیء client واتساپ (بازارسال شده از open-wa)

// تنظیم و راه‌اندازی open-wa
wa.create({
  useChrome: true,
  chromiumArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
  ],
  executablePath: '/usr/bin/chromium',
  qrTimeout: 0, // ما خودمان مدیریت QR کد را انجام می‌دهیم، پس Timeout را غیرفعال می‌کنیم
  multiDevice: true, // فعال‌سازی پشتیبانی از Multi Device واتساپ
  sessionId: 'session' // نام سشن برای ذخیره اطلاعات لاگین
})
.then(client => {
  waClient = client; // ذخیره شیء client واتساپ برای دسترسی‌های بعدی
  console.log('WA Automate client initialized. Starting main function...');
  start(client);     // فراخوانی تابع شروع اصلی

  // *** تغییر مهم: اطمینان از فراخوانی اولیه checkAndSetQrCode ***
  // این کد باید مطمئن بشه که checkAndSetQrCode بلافاصله بعد از راه‌اندازی اولیه client فراخوانی می‌شه.
  // یک تأخیر کوتاه برای اطمینان از بارگذاری کامل WhatsApp Web.
  console.log('Scheduling initial QR code check in 5 seconds...');
  setTimeout(checkAndSetQrCode, 5000); 

  // می‌توانیم یک اینتروال برای چک کردن وضعیت هم داشته باشیم، اما فعلاً به Polling تکیه می‌کنیم.
  // اگر بعداً نیاز شد، اینجا می‌تونیم یک setInterval هم اضافه کنیم.

})
.catch(err => {
  console.error("WA Automate Error during create:", err); // خطاهای هنگام ساخت client
  // در صورت بروز خطای جدی در شروع، می‌توانیم exit کنیم یا ری‌تری کنیم.
});

// تابع برای شروع و مدیریت رویدادهای واتساپ
function start(client) {
  console.log('WA Automate Client Started and listening for events.');

  // رصد تغییرات وضعیت واتساپ (مثلاً قطع اتصال، نیاز به اسکن مجدد)
  client.onStateChanged((state) => {
    console.log('State changed:', state);
    // اگر وضعیت به گونه‌ای بود که نیاز به QR کد جدید باشد، دوباره چک می‌کنیم
    if (state === 'CONFLICT' || state === 'UNLAUNCHED' || state === 'QR_CODE_NOT_FOUND') {
      console.log(`State requires re-authentication or QR scan: ${state}. Attempting to fetch QR again...`);
      // qrCodeData = null; // اگر وضعیت قطع شد، QR کد قبلی رو پاک کن
      client.forceRefocus(); // مرورگر واتساپ را رفرش می‌کند
      setTimeout(checkAndSetQrCode, 2000); // 2 ثانیه بعد دوباره QR کد رو چک کن
    } else if (state === 'CONNECTED') {
      console.log('WhatsApp client is now CONNECTED!');
      qrCodeData = null; // وقتی با موفقیت وصل شدیم، دیگه نیازی به نمایش QR کد نیست
    } else {
        console.log(`Current state: ${state}`);
    }
  });

  // مثال: پاسخ به پیام 'hi'
  client.onMessage(async message => {
    // اطمینان از اینکه پیام واقعی است و از رویدادهای سیستمی نیست
    if (!message.isGroupMsg && !message.isMedia && message.body && message.body.toLowerCase() === 'hi') {
      console.log(`Received 'hi' from ${message.from}`);
      await client.sendText(message.from, 'Hello from your bot! How can I help you today?');
    }
  });

  // رصد اضافه شدن به گروه
  client.onAddedToGroup((chat) => {
    console.log(`Added to group: ${chat.contact.name} (${chat.id})`);
  });

  // رصد رویدادهای دیگر (مثلاً قطع اتصال)
  client.onDisconnected((reason) => {
    console.log('Client disconnected:', reason);
    qrCodeData = null; // وقتی قطع شد، QR کد رو پاک کن
    console.log('Attempting to re-check QR code due to disconnection...');
    setTimeout(checkAndSetQrCode, 5000); // تلاش برای دریافت QR کد جدید
  });
}

// **تابع کلیدی:** دریافت QR کد به صورت دوره‌ای (Polling)
async function checkAndSetQrCode() {
  // اگر client واتساپ هنوز مقداردهی اولیه نشده بود، صبر کن.
  if (!waClient) {
      console.log('checkAndSetQrCode: Waiting for WA client to initialize...');
      setTimeout(checkAndSetQrCode, 5000);
      return; // از تابع خارج شو و منتظر بمان
  }

  // اگر QR کد قبلاً با موفقیت دریافت شده بود و وصل بودیم، دیگر نیازی به تلاش مجدد نیست
  // مگر اینکه وضعیت CONNECTED نباشد
  const connectionState = await waClient.getConnectionState();
  if (qrCodeData && connectionState === 'CONNECTED') {
      console.log('checkAndSetQrCode: QR Code already available and client is CONNECTED.');
      return; // از تابع خارج شو
  }

  // فقط زمانی تلاش می‌کنیم که QR کد هنوز دریافت نشده یا وضعیت نیاز به احراز هویت مجدد دارد
  try {
    const qr = await waClient.getQR(); // تلاش برای گرفتن آخرین QR کد
    // اگر QR کد معتبر (غیر از رشته خالی Base64) دریافت شد
    if (qr && qr !== 'data:image/png;base64,' && qr.length > 50) { // طول هم چک می‌شود
      qrCodeData = qr; // ذخیره QR کد در متغیر سراسری
      console.log('QR Code successfully fetched and stored!'); // پیام موفقیت
      console.log('You can now visit /qr to scan the QR code.');
    } else {
      // اگر QR کد هنوز آماده نبود یا خالی بود، با تأخیر 5 ثانیه دوباره تلاش کن
      console.log('checkAndSetQrCode: QR Code is not ready yet or invalid, retrying in 5 seconds...');
      setTimeout(checkAndSetQrCode, 5000); 
    }
  } catch (error) {
    // در صورت بروز خطا در حین دریافت QR کد، آن را ثبت کرده و دوباره تلاش کن
    console.error('checkAndSetQrCode: Error fetching QR code:', error.message);
    // اگر خطا مربوط به نبودن صفحه واتساپ یا کروم باشه
    if (error.message.includes('No current page provided') || error.message.includes('Execution context was destroyed')) {
        console.warn('Browser might be in an unstable state. Forcing refocus...');
        // این ممکن است به معنای نیاز به راه‌اندازی مجدد باشد، اما ابتدا forceRefocus را امتحان می‌کنیم
        waClient.forceRefocus(); 
    }
    setTimeout(checkAndSetQrCode, 5000); 
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
    res.status(200).send('QR Code not available yet. Please refresh in a few moments or check logs for status.');
  }
});

// مسیر اصلی برای نمایش وضعیت ربات
app.get('/', (req, res) => {
  res.status(200).send(`
    <h1>WAHA Bot Running</h1>
    <p>Visit <a href="/qr">/qr</a> to see the QR code if needed.</p>
    <p>Make sure you have linked your WhatsApp account.</p>
    <p>Check Render logs for detailed status.</p>
    ${qrCodeData ? '<p style="color: green;">QR code data is currently available in memory.</p>' : '<p style="color: red;">QR code data is not yet available in memory.</p>'}
  `);
});

// راه‌اندازی سرور Express
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access the QR code at: http://localhost:${PORT}/qr (replace localhost with your Render URL)`);
});
