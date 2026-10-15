;(() => {
  const config = window.LAZYDIET_CONFIG || {}
  const redirectUri = `${window.location.origin}/`
  const statusMessage = document.getElementById('status-message')
  const accountSummary = document.getElementById('account-summary')
  const accountName = document.getElementById('account-name')
  const providers = {
    naver: {label: '네이버', clientId: config.naverClientId},
    google: {label: 'Google', clientId: config.googleClientId},
    apple: {label: 'Apple', clientId: config.appleClientId}
  }

  if (config.kakaoJavascriptKey && window.Kakao?.init) {
    window.Kakao.init(config.kakaoJavascriptKey)
  }

  function randomState() {
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  function setStatus(message, isError = true) {
    statusMessage.textContent = message
    statusMessage.style.color = isError ? '#9b4638' : '#526a38'
  }

  async function completeLogin(payload) {
    setStatus('로그인 확인 중...', false)
    document.querySelectorAll('.provider-button').forEach((button) => {
      button.disabled = true
    })
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/social`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      if (!response.ok || !result.result) {
        throw new Error(result.err?.errorMessage || '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      }

      sessionStorage.setItem('lazydiet_access_token', result.token)
      sessionStorage.setItem('lazydiet_user', JSON.stringify(result.data))
      showAccount(result.data)
      setStatus('로그인되었습니다.', false)
    } catch (error) {
      setStatus(error.message || '서버에 연결할 수 없습니다.')
    } finally {
      document.querySelectorAll('.provider-button').forEach((button) => {
        button.disabled = false
      })
    }
  }

  function showAccount(user) {
    accountName.textContent = user.user_name || user.user_id
    accountSummary.hidden = false
  }

  function startOAuth(provider) {
    const entry = providers[provider]
    if (!entry?.clientId) {
      setStatus(`${entry?.label || '로그인'} 설정이 아직 완료되지 않았습니다.`)
      return
    }

    const state = randomState()
    sessionStorage.setItem(`lazydiet_oauth_state_${provider}`, state)
    const authorizeUrls = {
      kakao: `https://kauth.kakao.com/oauth/authorize?${new URLSearchParams({
        client_id: entry.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        state
      })}`,
      naver: `https://nid.naver.com/oauth2.0/authorize?${new URLSearchParams({
        client_id: entry.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        state
      })}`,
      google: `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: entry.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid profile',
        state
      })}`
    }
    window.location.assign(authorizeUrls[provider])
  }

  function startKakaoLogin() {
    if (!config.kakaoJavascriptKey || !window.Kakao?.Auth) {
      setStatus('카카오 로그인을 사용할 수 없습니다. JavaScript 키 설정을 확인해 주세요.')
      return
    }

    const state = randomState()
    sessionStorage.setItem('lazydiet_oauth_state_kakao', state)
    window.Kakao.Auth.authorize({redirectUri, state})
  }

  async function startAppleLogin() {
    if (!providers.apple.clientId || !window.AppleID?.auth) {
      setStatus('Apple 로그인을 사용할 수 없습니다. 설정을 확인해 주세요.')
      return
    }

    const state = randomState()
    try {
      window.AppleID.auth.init({
        clientId: providers.apple.clientId,
        scope: 'name email',
        redirectURI: redirectUri,
        state,
        usePopup: true
      })
      const result = await window.AppleID.auth.signIn()
      if (result.authorization.state !== state) throw new Error('Apple 로그인 상태를 확인할 수 없습니다.')
      const name = result.user?.name
      const displayName = name ? `${name.firstName || ''} ${name.lastName || ''}`.trim() : undefined
      await completeLogin({provider: 'apple', identity_token: result.authorization.id_token, display_name: displayName})
    } catch (error) {
      if (error.error !== 'user_cancelled_authorize') setStatus(error.message || 'Apple 로그인에 실패했습니다.')
    }
  }

  async function handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const provider = Object.keys(providers).find(
      (key) => sessionStorage.getItem(`lazydiet_oauth_state_${key}`) === state
    )

    if (params.has('error')) {
      window.history.replaceState({}, '', redirectUri)
      setStatus('로그인이 취소되었거나 승인되지 않았습니다.')
      return
    }
    if (!code) return

    window.history.replaceState({}, '', redirectUri)
    if (!provider || provider === 'apple') {
      setStatus('로그인 요청을 확인할 수 없습니다. 다시 시도해 주세요.')
      return
    }

    sessionStorage.removeItem(`lazydiet_oauth_state_${provider}`)
    await completeLogin({provider, authorization_code: code, redirect_uri: redirectUri, oauth_state: state})
  }

  document.querySelectorAll('.provider-button').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.provider === 'kakao') startKakaoLogin()
      else if (button.dataset.provider === 'apple') startAppleLogin()
      else startOAuth(button.dataset.provider)
    })
  })

  document.getElementById('logout-button').addEventListener('click', () => {
    sessionStorage.removeItem('lazydiet_access_token')
    sessionStorage.removeItem('lazydiet_user')
    accountSummary.hidden = true
    setStatus('로그아웃되었습니다.', false)
  })

  try {
    const user = JSON.parse(sessionStorage.getItem('lazydiet_user') || 'null')
    if (user) showAccount(user)
  } catch (error) {
    sessionStorage.removeItem('lazydiet_user')
  }

  handleOAuthCallback()
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => {})
})()
