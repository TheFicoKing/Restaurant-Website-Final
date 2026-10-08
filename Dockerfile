FROM node:24-bookworm-slim

WORKDIR /app

# Install server dependencies. An existing compatible lockfile is also used.
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Only the container copy uses its own backend.
# GitHub Pages and your original config.js keep using the existing Render API.
RUN printf '%s\n' 'window.ATA_CONFIG = { apiBaseUrl: "" };' > assets/js/config.js \
    && sed -i 's#action="https://restaurant-backend-kjtm.onrender.com/book-table"#action="/book-table"#g' index.html

ENV NODE_ENV=production
ENV PORT=3000

USER node
EXPOSE 3000

CMD ["node", "server.js"]
