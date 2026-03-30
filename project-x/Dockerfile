# ─────────────────────────────────────────────────────────────────────────────
# Project-X WhatsApp Bot — Production Dockerfile
#
# Native modules used:
#   canvas          → requires build-essential, libcairo2-dev, libpango1.0-dev,
#                     libjpeg-dev, libgif-dev, librsvg2-dev, pkg-config
#   sharp           → requires libvips (auto-installed via npm, needs build tools)
#   wa-sticker-fmt  → depends on sharp
#   chess-image-gen → depends on canvas
#   node-html-to-image + Puppeteer → requires Chromium + all its X11/GTK deps
#   ffmpeg          → gifToMp4 / webpToMp4 / audio effects (helpler.js)
#   forever-monitor → process restarter (boot.js)
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-slim

# ── System dependencies ───────────────────────────────────────────────────────
# Grouped into logical layers to make cache-busting obvious:
#   1. Build tools      — compile native Node addons (canvas, sharp)
#   2. Canvas libs      — libcairo, pango, libjpeg, libgif, librsvg
#   3. FFmpeg           — media conversion (gif→mp4, webp→mp4, audio)
#   4. Chromium + deps  — Puppeteer / node-html-to-image
#   5. Fonts            — renders text correctly inside HTML→image

RUN apt-get update && apt-get install -y --no-install-recommends \
    \
    # ── Build tools (for canvas, sharp native compilation) ──────────────── \
    build-essential \
    python3 \
    pkg-config \
    \
    # ── Canvas native dependencies ──────────────────────────────────────── \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    \
    # ── FFmpeg ──────────────────────────────────────────────────────────── \
    ffmpeg \
    \
    # ── Chromium + all required system libraries ─────────────────────────── \
    chromium \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    \
    # ── Fonts ───────────────────────────────────────────────────────────── \
    fonts-liberation \
    fonts-noto-color-emoji \
    \
    && rm -rf /var/lib/apt/lists/*

# ── Puppeteer config ──────────────────────────────────────────────────────────
# Skip bundled Chromium download — use the system one installed above.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# ── Working directory ─────────────────────────────────────────────────────────
WORKDIR /app

# ── Install dependencies ──────────────────────────────────────────────────────
# Copy package files first so Docker caches this layer.
# A code change won't re-run npm install unless package*.json changed.
COPY package*.json ./

RUN npm install --omit=dev

# ── Copy source ───────────────────────────────────────────────────────────────
# .dockerignore should exclude: node_modules, sessions, cache, *.log, .env
COPY . .

# ── Runtime environment ───────────────────────────────────────────────────────
# 512 MB heap — raise to 1024 if you see OOM crashes on large decks/collages
ENV NODE_OPTIONS="--max-old-space-size=512"

# Baileys writes session files — needs a writable sessions dir
RUN mkdir -p /app/sessions /app/cache/cards

# ── Healthcheck ───────────────────────────────────────────────────────────────
# Hits the bot's local HTTP server (src/server.js runs on port 8000).
# Adjust interval/timeout to taste.
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:8000/health || exit 1

EXPOSE 8000

# ── Start via boot.js (forever-monitor handles auto-restart on crash) ─────────
CMD ["node", "boot.js"]