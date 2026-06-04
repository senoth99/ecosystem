FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json ./
RUN npm install
COPY src ./src
RUN npm install -g tsx
EXPOSE 4003
CMD ["tsx", "src/index.ts"]
