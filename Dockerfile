FROM node:22-bookworm-slim
# Install Chrome dependencies and ffmpeg
RUN apt-get update
RUN apt install -y \
  libnss3 \
  libdbus-1-3 \
  libatk1.0-0 \
  libgbm-dev \
  libasound2 \
  libxrandr2 \
  libxkbcommon-dev \
  libxfixes3 \
  libxcomposite1 \
  libxdamage1 \
  libatk-bridge2.0-0 \
  libpango-1.0-0 \
  libcairo2 \
  libcups2 \
  fonts-noto-color-emoji \
  fonts-noto-cjk \
  ffmpeg

WORKDIR /app

COPY . .

RUN npm i -g pnpm

# 安装依赖并构建
RUN pnpm install
# RUN pnpm run build

ENV NODE_ENV=production
# ENV CHROME_PATH=/usr/bin/chromium

EXPOSE 3000

CMD ["pnpm", "start"]