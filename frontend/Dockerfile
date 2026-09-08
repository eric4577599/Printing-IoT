# Build stage
FROM --platform=linux/amd64 node:20-alpine as build

# S14:脈絡是專案根。刻意重建「doc/ 與 frontend/ 並列」的結構,
# 讓 docRegistry 的 '../../../../doc/*.md' 在容器內與開發機解析到同一個地方 ——
# 兩邊路徑不同構,就會變成「本機過、進 Docker 炸」。
WORKDIR /src

COPY frontend/package*.json ./frontend/
WORKDIR /src/frontend
RUN npm ci

WORKDIR /src
COPY frontend/ ./frontend/
COPY doc/ ./doc/

WORKDIR /src/frontend
RUN npm run build

# Production stage
FROM nginx:stable

COPY --from=build /src/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
