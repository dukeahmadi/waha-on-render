# از یک ایمیج Node.js شروع کنید
FROM node:18-slim

# نصب وابستگی‌های لازم برای Chromium
# این لیست ممکن است بسته به ایمیج پایه Node.js و نیازهای Chromium کمی متفاوت باشد.
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
# این مرحله باعث می‌شود puppeteer-core Chromium را دانلود کند.
# اگر قبلا PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true را تنظیم کرده بودید، آن را حذف کنید.
RUN npm install

# پیدا کردن مسیر Chromium دانلود شده توسط Puppeteer و تنظیم آن به عنوان CHROME_PATH
# این دستور سعی می‌کند مسیر Chromium را پیدا کرده و متغیر محیطی CHROME_PATH را تنظیم کند.
# مسیر دقیق ممکن است بسته به نسخه Puppeteer متفاوت باشد.
# اگر این خط کار نکرد، باید مسیر دقیق را از لاگ‌های بیلد قبلی پیدا کنید.
RUN CHROMIUM_PATH=$(find /root/.cache/puppeteer -name chrome | head -n 1) \
    && echo "Chromium path: $CHROMIUM_PATH" \
    && test -f "$CHROMIUM_PATH" # بررسی کند که فایل اجرایی وجود دارد
ENV CHROME_PATH="/root/.cache/puppeteer/chrome/linux-*/chrome-linux*/chrome"
# این مسیر تقریبی است. اگر بیلد باز هم ارور داد،
# در مرحله npm install یک بار بدون ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# بیلد را اجرا کنید تا ببینید کرومیوم دقیقاً کجا دانلود می‌شود.
# سپس مسیر صحیح را اینجا قرار دهید.

# کپی کردن بقیه فایل‌های پروژه
COPY . .

# پورت مورد نیاز اپلیکیشن Waha را اکسپوز کنید
EXPOSE 8000

# دستور شروع اپلیکیشن
CMD ["npm", "start"]
