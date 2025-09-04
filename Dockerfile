FROM node:alpine

WORKDIR /app

COPY . .

RUN npm install

# Set default database path for libsql
ENV DATABASE_URL="file:/app/database.sqlite"

EXPOSE 3000

CMD ["npm", "run", "dev"]
