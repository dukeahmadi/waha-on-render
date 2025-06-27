const { create } = require('@open-wa/wa-automate');
// const puppeteer = require('puppeteer'); // این خط را دیگر لازم نداریم چون puppeteer-core از خودش executablePath ندارد.

(async () => {
  // این خط را حذف کنید. puppeteer-core به صورت خودکار executablePath را پیدا نمی‌کند.
  // const executablePath = puppeteer.executablePath(); 

  create({
    sessionId: "waha-render",
    multiDevice: true,
    headless: true,
    qrTimeout: 0,
    authTimeout: 60,
    cacheEnabled: false,
    useChrome: true, // مهم: true بگذارید
    killProcessOnBrowserClose: true,
    disableSpins: true,
    throwErrorOnTosBlock: false,
    logConsole: false,
    popup: false,
    // executablePath, // این خط را حذف کنید.
    chromiumArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu', // برای محیط‌های بدون GPU اضافه شود
      '--disable-dev-shm-usage', // برای محیط‌های کانتینری
      '--single-process', // ممکن است کمک کند
      '--disable-extensions',
      '--disable-setuid-sandbox',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gl-drawing-for-tests'
    ],
    server: true,
    apiHost: '0.0.0.0',
    apiPort: process.env.PORT || 8000
  }).then(client => {
    console.log('✅ Waha is ready!');
  }).catch(e => {
    console.error('❌ Waha failed to start', e);
  });
})();
