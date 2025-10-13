FROM node:18-alpine

RUN apk add --no-cache git

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

CMD ["npm", "start"]
