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

# نصب وابستگی‌های Node.js
RUN npm install

# این خطوط مربوط به پیدا کردن مسیر Chromium را حذف کنید
# # RUN CHROMIUM_PATH=$(find /root/.cache/puppeteer -name chrome | head -n 1) \
# #    && echo "Chromium path: $CHROMIUM_PATH" \
# #    && test -f "$CHROMIUM_PATH" # بررسی کند که فایل اجرایی وجود دارد

# متغیر محیطی CHROME_PATH را مستقیماً تنظیم کنید.
# Puppeteer Chromium را در این مسیر دانلود می‌کند: /root/.cache/puppeteer/chrome/linux-<version>/chrome-linux64/chrome
# ما از یک wildcard (*) برای پوشه نسخه استفاده می‌کنیم.
ENV CHROME_PATH="/root/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome"

# کپی کردن بقیه فایل‌های پروژه
COPY . .

# پورت مورد نیاز اپلیکیشن Waha را اکسپوز کنید
EXPOSE 8000

# دستور شروع اپلیکیشن
CMD ["npm", "start"]
