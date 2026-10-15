# wonday-api

## Development

```bash
npm install
npm run dev
```

## Deployment

`main` 브랜치에 push되면 GitHub Actions(`.github/workflows/deploy.yml`)가 다음을 수행합니다.

1. S3(`s3://hn3ehn-env/wonday/.env`)에서 `.env`를 내려받아 이미지에 포함
2. Docker 이미지를 빌드해 ECR(`161363670536.dkr.ecr.ap-northeast-2.amazonaws.com/lazy_diet`)로 push
3. EC2(`52.78.109.98`)에 SSH로 접속해 `docker-compose-prod.yml` 기준으로 컨테이너 재기동
4. `nginx-proxy` + `letsencrypt-nginx-proxy-companion`이 `https://api.lazydiet.hnsehn.com`으로 HTTPS 서빙 (인증서 자동 발급/갱신)

배포 후 API는 `https://api.lazydiet.hnsehn.com`으로 접근합니다. EC2 보안 그룹 인바운드에 `22`, `80`, `443`이 열려 있어야 합니다 (`4000`은 컨테이너 내부에서만 쓰여서 외부에 열 필요 없음).

### 필요한 GitHub Secrets

- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: ECR push, S3 `.env` 조회, EC2에서 ECR pull 시 사용
- `EC2_SSH_PRIVATE_KEY`: `52.78.109.98` 접속용 SSH 프라이빗 키(PEM) 전체 내용
