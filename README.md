# lazyDiet-api

## Development

```bash
npm install
npm run dev
```

## SNS 로그인

`POST /api/auth/social`은 카카오·네이버·구글의 OAuth `authorization_code` 또는 `access_token`, 애플의 `identity_token`을 확인한 뒤 기존 로그인과 같은 JWT 및 사용자 정보를 반환합니다. 최초 로그인 시 `social_auth`에 공급자 계정이 연결되며, 이메일 주소만으로 기존 계정에 자동 연결하지 않습니다.

```json
{
	"provider": "kakao",
	"access_token": "provider_access_token",
	"fcm_token": "optional_fcm_token"
}
```

`provider`는 `kakao`, `naver`, `google`, `apple` 중 하나입니다. 애플은 `access_token` 대신 `identity_token`을 보내야 하며, 서버 환경 변수 `APPLE_CLIENT_ID`에는 애플 앱의 Bundle ID 또는 Services ID를 설정해야 합니다. 적용 전 데이터베이스 마이그레이션(`npm run migrate`)을 실행하세요.

## 웹앱 로그인 배포

`server/public`의 설치형 웹앱은 API와 같은 서버에서 제공하며, 운영 주소는 `https://lazydiet.hnsehn.com`입니다. OAuth 제공자 콘솔의 웹 도메인과 콜백 URL에 `lazydiet.hnsehn.com`과 `https://lazydiet.hnsehn.com/`를 등록해야 합니다. DNS에서 이 도메인을 API 서버와 같은 EC2로 연결하고, 배포 시 HTTPS 인증서가 발급되도록 합니다.

배포 환경의 `.env`에 아래 키와 콜백 주소를 설정합니다. 카카오 JavaScript 키만 브라우저에 공개되며, REST API 키와 Secret은 서버 토큰 교환에만 사용합니다. 카카오 Secret은 카카오 콘솔에서 활성화한 경우에만 설정하면 됩니다. `APPLE_CLIENT_ID`는 웹용 Services ID를 사용합니다.

```dotenv
PUBLIC_API_BASE_URL=https://api.lazydiet.hnsehn.com
KAKAO_JAVASCRIPT_KEY=
KAKAO_REST_API_KEY=
KAKAO_CLIENT_SECRET=
KAKAO_REDIRECT_URI=https://lazydiet.hnsehn.com/
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
NAVER_REDIRECT_URI=https://lazydiet.hnsehn.com/
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://lazydiet.hnsehn.com/
APPLE_CLIENT_ID=
```

`.env` 변경 후 앱 이미지를 다시 빌드·배포해야 합니다. 로그인 웹앱은 `/`에 제공되며 OAuth 로그인에는 인터넷 연결이 필요합니다.

## Deployment

`main` 브랜치에 push되면 GitHub Actions(`.github/workflows/deploy.yml`)가 다음을 수행합니다.

1. S3(`s3://hn3ehn-env/lazyDiet/.env`)에서 `.env`를 내려받아 이미지에 포함
2. Docker 이미지를 빌드해 ECR(`161363670536.dkr.ecr.ap-northeast-2.amazonaws.com/lazy_diet`)로 push
3. EC2(`52.78.109.98`)에 SSH로 접속해 `docker-compose-prod.yml` 기준으로 컨테이너 재기동
4. `nginx-proxy` + `letsencrypt-nginx-proxy-companion`이 `https://lazydiet.hnsehn.com` 웹앱과 `https://api.lazydiet.hnsehn.com` API를 HTTPS 서빙 (인증서 자동 발급/갱신)

배포 후 웹앱은 `https://lazydiet.hnsehn.com`, API는 `https://api.lazydiet.hnsehn.com`으로 접근합니다. 두 DNS 레코드가 모두 `52.78.109.98`을 가리켜야 합니다. EC2 보안 그룹 인바운드에 `22`, `80`, `443`이 열려 있어야 합니다 (`4000`은 컨테이너 내부에서만 쓰여서 외부에 열 필요 없음).

### 필요한 GitHub Secrets

- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: ECR push, S3 `.env` 조회, EC2에서 ECR pull 시 사용
- `EC2_SSH_PRIVATE_KEY`: `52.78.109.98` 접속용 SSH 프라이빗 키(PEM) 전체 내용
