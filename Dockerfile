# EC2(x86_64) 기준, amd64로 고정
FROM --platform=linux/amd64 node:20-alpine

WORKDIR /app

# 네이티브 모듈 필요 시 주석 해제
# RUN apk add --no-cache python3 make g++

# package 설치(락파일 기준 재현성 높음)
COPY package*.json ./
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci --omit=dev --no-audit --no-fund

# 앱 소스
COPY . .

# pm2 설치
RUN npm i -g pm2@latest

# 포트 선언 (매핑 아님)
EXPOSE 4000

# exec 형식으로 지정
ENTRYPOINT ["pm2-runtime"]
CMD ["--json", "pm2Server.json"]
