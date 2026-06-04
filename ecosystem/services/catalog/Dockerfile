FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY src ./src
RUN npm install -g tsx
EXPOSE 4002
CMD ["tsx", "src/index.ts"]
