FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

COPY . .

RUN npm run build
RUN npm run prisma:generate

CMD ["sh", "-c", "node --experimental-specifier-resolution=node /app/dist/index.js"]