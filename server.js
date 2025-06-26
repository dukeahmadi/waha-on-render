const { create } = require('@open-wa/wa-automate');

create({
  sessionId: "waha-render",
  multiDevice: true,
  headless: true,
  qrTimeout: 0,
  authTimeout: 60,
  cacheEnabled: false,
  useChrome: true,
  executablePath: "/usr/bin/chromium-browser", // مسیر مرورگر در سرور Render
  chromiumArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
  killProcessOnBrowserClose: true,
  disableSpins: true,
  throwErrorOnTosBlock: false,
  logConsole: false,
  popup: false,

  // فعال‌سازی API
  server: true,
  apiHost: '0.0.0.0',
  apiPort: process.env.PORT || 8000
}).then(client => {
  console.log('✅ Waha is ready!');
}).catch(e => {
  console.error('❌ Waha failed to start', e);
});
