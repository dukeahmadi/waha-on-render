# از یک ایمیج Node.js شروع کنید
FROM node:18-slim

# نصب وابستگی‌های لازم برای Chromium
# این لیست ممکن است بسته به ایمیج پایه Node.js و نیازهای Chromium کمی متفاوت باشد.
# برای Puppeteer/Chromium در محیط‌های لینوکس
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# تنظیم متغیر محیطی برای Puppeteer تا Chromium را دانلود نکند
# اگر قبلا Chromium در ایمیج وجود دارد، Puppeteer از آن استفاده می‌کند.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# یا اگر میخواهید Puppeteer خودش دانلود کند
# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
# ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome # اگر در ایمیج پایه وجود دارد

# تنظیمات مربوط به دایرکتوری کاری
WORKDIR /app

# کپی کردن فایل‌های package.json و package-lock.json (اگر دارید)
COPY package*.json ./

# نصب وابستگی‌های Node.js
RUN npm install

# کپی کردن بقیه فایل‌های پروژه
COPY . .

# پورت مورد نیاز اپلیکیشن Waha را اکسپوز کنید (بر اساس apiPort شما)
EXPOSE 8000

# دستور شروع اپلیکیشن
CMD ["npm", "start"]
