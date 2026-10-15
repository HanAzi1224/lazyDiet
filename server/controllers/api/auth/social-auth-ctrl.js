const crypto = require('crypto')
const bcrypt = require('bcrypt-nodejs')
const axios = require('axios')
const jwtService = require('jsonwebtoken')
const jwt = require('../../../libs/jwt')
const db = require('../../../models')

const providers = {
  kakao: {name: '카카오', userInfoUrl: 'https://kapi.kakao.com/v2/user/me'},
  naver: {name: '네이버', userInfoUrl: 'https://openapi.naver.com/v1/nid/me'},
  google: {name: '구글', userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'}
}

function getOAuthCredentials(provider) {
  const prefix = provider.toUpperCase()
  const clientId = provider === 'kakao' ? process.env.KAKAO_REST_API_KEY : process.env[`${prefix}_CLIENT_ID`]
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`]
  const redirectUri = process.env[`${prefix}_REDIRECT_URI`]

  if (!clientId || (provider !== 'kakao' && !clientSecret) || !redirectUri) {
    throw {status: 500, errorMessage: `${providers[provider].name} OAuth 설정이 필요합니다.`}
  }

  return {clientId, clientSecret, redirectUri}
}

async function exchangeAuthorizationCode(provider, code, redirectUri, state) {
  const {clientId, clientSecret, redirectUri: configuredRedirectUri} = getOAuthCredentials(provider)
  if (redirectUri !== configuredRedirectUri) {
    throw {status: 400, errorMessage: 'OAuth redirect_uri 설정이 일치하지 않습니다.'}
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: configuredRedirectUri,
    code
  })
  if (clientSecret) params.set('client_secret', clientSecret)
  if (provider === 'naver') params.set('state', state || '')

  const tokenUrls = {
    kakao: 'https://kauth.kakao.com/oauth/token',
    naver: 'https://nid.naver.com/oauth2.0/token',
    google: 'https://oauth2.googleapis.com/token'
  }

  try {
    const response =
      provider === 'naver'
        ? await axios.get(tokenUrls[provider], {params: Object.fromEntries(params), timeout: 10000})
        : await axios.post(tokenUrls[provider], params.toString(), {
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            timeout: 10000
          })
    if (!response.data.access_token) throw new Error('Provider response did not contain an access token')
    return response.data.access_token
  } catch (error) {
    if (error.status) throw error
    if (error.response && [400, 401].includes(error.response.status)) {
      throw {status: 401, errorMessage: 'OAuth 인가 코드가 유효하지 않거나 만료되었습니다.'}
    }
    throw {status: 502, errorMessage: 'SNS 토큰을 발급받지 못했습니다.'}
  }
}

let appleJwks
let appleJwksExpiresAt = 0

async function getAppleJwks(forceRefresh = false) {
  if (!forceRefresh && appleJwks && Date.now() < appleJwksExpiresAt) return appleJwks

  let response
  try {
    response = await axios.get('https://appleid.apple.com/auth/keys', {timeout: 10000})
  } catch (error) {
    throw {status: 502, errorMessage: '애플 인증 정보를 확인할 수 없습니다.'}
  }
  appleJwks = response.data.keys
  appleJwksExpiresAt = Date.now() + 60 * 60 * 1000
  return appleJwks
}

async function verifyAppleIdentityToken(identityToken) {
  const audience = process.env.APPLE_CLIENT_ID
  if (!audience) throw {status: 500, errorMessage: 'APPLE_CLIENT_ID 설정이 필요합니다.'}

  const decoded = jwtService.decode(identityToken, {complete: true})
  if (!decoded || !decoded.header || decoded.header.alg !== 'RS256' || !decoded.header.kid) {
    throw {status: 401, errorMessage: '유효하지 않은 SNS 토큰입니다.'}
  }

  let keys = await getAppleJwks()
  let jwk = keys.find((key) => key.kid === decoded.header.kid)
  if (!jwk) {
    keys = await getAppleJwks(true)
    jwk = keys.find((key) => key.kid === decoded.header.kid)
  }
  if (!jwk) throw {status: 401, errorMessage: '유효하지 않은 SNS 토큰입니다.'}

  const publicKey = crypto.createPublicKey({key: jwk, format: 'jwk'})
  const claims = jwtService.verify(identityToken, publicKey, {
    algorithms: ['RS256'],
    issuer: 'https://appleid.apple.com',
    audience
  })

  if (!claims.sub) throw {status: 401, errorMessage: '유효하지 않은 SNS 토큰입니다.'}
  return {providerUserId: claims.sub, name: null}
}

async function fetchProviderUser(provider, accessToken) {
  let response
  try {
    response = await axios.get(providers[provider].userInfoUrl, {
      headers: {Authorization: `Bearer ${accessToken}`},
      timeout: 10000
    })
  } catch (error) {
    if (error.response && [400, 401, 403].includes(error.response.status)) {
      throw {status: 401, errorMessage: '유효하지 않은 SNS 토큰입니다.'}
    }
    throw {status: 502, errorMessage: 'SNS 사용자 정보를 확인할 수 없습니다.'}
  }

  const data = response.data
  if (provider === 'kakao' && data.id) {
    return {providerUserId: String(data.id), name: data.kakao_account?.profile?.nickname}
  }
  if (provider === 'naver' && data.resultcode === '00' && data.response?.id) {
    return {providerUserId: data.response.id, name: data.response.name}
  }
  if (provider === 'google' && data.sub) {
    return {providerUserId: data.sub, name: data.name}
  }
  throw {status: 401, errorMessage: '유효하지 않은 SNS 토큰입니다.'}
}

async function verifyProviderToken(options) {
  const {
    provider,
    access_token: suppliedAccessToken,
    authorization_code: authorizationCode,
    redirect_uri: redirectUri,
    oauth_state: oauthState,
    identity_token: identityToken
  } = options

  if (provider === 'apple') {
    if (!identityToken) throw {status: 400, errorMessage: '애플 identity_token이 필요합니다.'}
    try {
      return await verifyAppleIdentityToken(identityToken)
    } catch (error) {
      if (error.status) throw error
      throw {status: 401, errorMessage: '유효하지 않은 SNS 토큰입니다.'}
    }
  }

  const accessToken = authorizationCode
    ? await exchangeAuthorizationCode(provider, authorizationCode, redirectUri, oauthState)
    : suppliedAccessToken
  if (!accessToken) throw {status: 400, errorMessage: 'SNS access_token이 필요합니다.'}
  return fetchProviderUser(provider, accessToken)
}

module.exports.signIn = async (req, res, next) => {
  const {provider, display_name: displayName, fcm_token: fcmToken} = req.options
  let identity
  try {
    identity = await verifyProviderToken(req.options)
  } catch (error) {
    return next(error)
  }

  let transaction
  try {
    transaction = await db.sequelize.transaction()
    const {providerUserId, name} = identity
    let socialAuth = await db.SocialAuth.findOne({where: {provider, provider_user_id: providerUserId}, transaction})
    let user

    if (socialAuth) {
      user = await db.Users.findByPk(socialAuth.user_idx, {transaction})
      if (!user) throw {status: 404, errorMessage: '사용자를 찾을 수 없습니다.'}
    } else {
      const userIdHash = crypto.createHash('sha256').update(`${provider}:${providerUserId}`).digest('hex')
      user = await db.Users.create(
        {
          user_id: `sns_${userIdHash}`,
          user_name: name || displayName || providers[provider]?.name || '애플 사용자',
          user_phone: null,
          fcm_token: fcmToken || null
        },
        {transaction}
      )
      socialAuth = await db.SocialAuth.create(
        {user_idx: user.user_idx, provider, provider_user_id: providerUserId},
        {transaction}
      )
    }

    const token = await jwt.createAccessToken({user_idx: user.user_idx, user_id: user.user_id})
    const userAuth = await db.UserAuth.findOne({where: {user_idx: user.user_idx}, transaction})
    if (userAuth) {
      await userAuth.update({access_token: token}, {transaction})
    } else {
      const salt = bcrypt.genSaltSync()
      const randomPassword = crypto.randomBytes(32).toString('hex')
      await db.UserAuth.create(
        {
          user_idx: user.user_idx,
          user_pwd: bcrypt.hashSync(randomPassword, salt),
          user_salt: salt,
          access_token: token
        },
        {transaction}
      )
    }

    if (fcmToken && socialAuth) {
      await user.update({fcm_token: fcmToken}, {transaction})
    }

    await transaction.commit()
    return res.status(200).json({
      result: true,
      token,
      data: {
        user_idx: user.user_idx,
        user_id: user.user_id,
        user_name: user.user_name,
        user_phone: user.user_phone
      }
    })
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback()
    next(error)
  }
}
