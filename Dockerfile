# از یک ایمیج Node.js شروع کنید
FROM node:18-slim

# نصب وابستگی‌های لازم برای Chromium
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

# تنظیم دایرکتوری کاری
WORKDIR /app

# کپی کردن فایل‌های package.json و package-lock.json
COPY package*.json ./

# **اینجا تغییرات اصلی:**
# تنظیم مسیر کش Puppeteer به /usr/local/share/.cache/puppeteer
ENV PUPPETEER_CACHE_DIR=/usr/local/share/.cache/puppeteer
# اطمینان حاصل کنید که Puppeteer Chromium را دانلود می‌کند (پیش‌فرض false است)
ENV PUPPETEER_SKIP_DOWNLOAD=false

# نصب وابستگی‌های Node.js
# Puppeteer در حین npm install به صورت خودکار Chromium را در PUPPETEER_CACHE_DIR دانلود خواهد کرد.
RUN npm install

# تعیین مسیر دقیق فایل اجرایی Chromium بر اساس PUPPETEER_CACHE_DIR و ساختار دانلود Puppeteer
# این مسیر باید کاملاً دقیق باشد
ENV CHROME_PATH="/usr/local/share/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome"

# کپی کردن بقیه فایل‌های پروژه
COPY . .

# پورت مورد نیاز اپلیکیشن Waha را اکسپوز کنید
EXPOSE 8000

# دستور شروع اپلیکیشن
CMD ["npm", "start"]
