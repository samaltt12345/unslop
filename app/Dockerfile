# GeoMaster production image
# Docker makes the Render runtime unambiguous: this is a Node/Next.js app,
# regardless of what language Render's automatic detector guesses.
FROM node:22.11.0-bookworm-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Copy whichever npm manifests are present. `package*.json` matches package.json
# even if package-lock.json was not committed to GitHub.
COPY package*.json ./

# Prefer a reproducible locked install, but do not make deployment depend on a
# lockfile existing in the remote repository. Dev dependencies are required for
# Tailwind, TypeScript, and the one-time Drizzle schema push at startup.
RUN if [ -f package-lock.json ]; then \
      npm ci --include=dev; \
    else \
      echo "package-lock.json not found; installing from package.json"; \
      npm install --include=dev; \
    fi

COPY . .

# Database access is lazy, so the image builds without DATABASE_URL.
RUN npm run build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=10000

EXPOSE 10000

# Apply the schema to Render Postgres, then start Next.js on Render's assigned port.
CMD ["sh", "-c", "npx drizzle-kit push --force && npm run start -- -H 0.0.0.0 -p ${PORT:-10000}"]
