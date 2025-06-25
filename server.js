const { create } = require('@open-wa/wa-automate');

create({
  sessionId: "waha-render",
  multiDevice: true,
  headless: true,
  qrTimeout: 0,
  authTimeout: 60,
  cacheEnabled: false,
  useChrome: false,
  killProcessOnBrowserClose: true,
  disableSpins: true,
  throwErrorOnTosBlock: false,
  logConsole: false,
  popup: false,
  chromiumArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
  // برای API سرور:
  server: true,
  apiHost: '0.0.0.0',
  apiPort: process.env.PORT || 8000
}).then(client => {
  console.log('Waha is ready!');
}).catch(e => {
  console.error('Waha failed to start', e);
});
