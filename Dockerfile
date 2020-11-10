FROM node:14-alpine
LABEL name "modmailbot"
LABEL version "3.2.0"

WORKDIR /usr/modmailbot

COPY package.json package-lock.json ./
RUN npm ci --production

COPY src ./src
COPY knexfile.js ./knexfile.js

CMD ["npm", "start"]
