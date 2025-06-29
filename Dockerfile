# استفاده از یک ایمیج پایه Node.js
FROM node:18-buster

# ساخت دایرکتوری کار در کانتینر
WORKDIR /usr/src/app

# کپی کردن package.json و package-lock.json برای نصب وابستگی‌ها
# این کار بهینه‌تره چون اگر وابستگی‌ها تغییر نکنن، لایه‌ی داکر از کش استفاده می‌کنه
COPY package*.json ./

# نصب وابستگی‌های Node.js
RUN npm install

# نصب Chromium و ابزارهای لازم
# این مرحله برای open-wa ضروریه تا بتونه مرورگر رو اجرا کنه
RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# کپی کردن بقیه فایل‌های پروژه
COPY . .

# پورتی که اپلیکیشن Node.js شما روی اون گوش میده
EXPOSE 10000

# دستور شروع اپلیکیشن
CMD [ "npm", "start" ]
