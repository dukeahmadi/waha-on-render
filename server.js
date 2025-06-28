const wa = require('@open-wa/wa-automate');
const express = require('express');
const app = express();

const PORT = process.env.PORT || 8000;
let qrCodeData = null;

wa.create({
  // **NEW: Add useChrome: true as recommended by open-wa**
  useChrome: true, 
  
  // Keep essential chromiumArgs for Docker.
  // We're removing `--single-process` as it can sometimes cause issues.
  // And also other less critical args based on open-wa's warning.
  chromiumArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    // You can keep --disable-gpu if you want, but often not strictly needed in headless
    // '--disable-gpu', 
    '--disable-dev-shm-usage', // Essential for Docker
    // '--single-process', // <-- Remove this line
    // '--disable-extensions', // <-- Remove this line
    // '--disable-accelerated-2d-canvas', // <-- Remove this line
    // '--no-first-run', // <-- Remove this line
    // '--no-zygote', // <-- Remove this line
    // '--disable-gl-drawing-for-tests' // <-- Remove this line
  ],
  
  // Ensure executablePath points to where Chromium is installed in your Dockerfile
  // Based on your Dockerfile, '/usr/bin/chromium' is the correct path.
  executablePath: '/usr/bin/chromium', 

  qrTimeout: 0, 
  multiDevice: true 
})
.then(client => start(client))
.catch(err => console.error("WA Automate Error:", err));

function start(client) {
  console.log('WA Automate Client Started');

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

  // This is the correct way to get the QR code from open-wa
  client.onqr((qrCode) => {
    console.log('QR Code received!'); // This is the log we're looking for!
    qrCodeData = qrCode; // Store the QR code
  });

  client.onAddedToGroup((chat) => {
    console.log('Added to group:', chat.contact.name);
  });
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
    res.send('QR Code not available yet. Please refresh in a few moments.');
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h1>WAHA Bot Running</h1>
    <p>Visit <a href="/qr">/qr</a> to see the QR code if needed.</p>
    <p>Make sure you have linked your WhatsApp account.</p>
  `);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access the QR code at: http://localhost:${PORT}/qr (replace localhost with your Render URL)`);
});
