;(() => {
  const config = window.LAZYDIET_CONFIG || {}
  const redirectUri = `${window.location.origin}/`
  const loginView = document.getElementById('login-view')
  const appView = document.getElementById('app-view')
  const statusMessage = document.getElementById('status-message')
  const providers = {
    kakao: {label: '카카오'},
    naver: {label: '네이버', clientId: config.naverClientId},
    google: {label: 'Google', clientId: config.googleClientId},
    apple: {label: 'Apple', clientId: config.appleClientId}
  }
  const mealNames = {breakfast: '아침', lunch: '점심', snack: '간식', dinner: '저녁'}
  const nutrientNames = {
    protein_g: ['단백질', 'g'],
    carbs_g: ['탄수화물', 'g'],
    fat_g: ['지방', 'g'],
    fiber_g: ['식이섬유', 'g'],
    sodium_mg: ['나트륨', 'mg']
  }
  const state = {profile: null, day: null, period: 'week', history: null}

  if (config.kakaoJavascriptKey && window.Kakao?.init) window.Kakao.init(config.kakaoJavascriptKey)

  function randomState() {
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  function setStatus(message, isError = true) {
    statusMessage.textContent = message
    statusMessage.classList.toggle('is-error', isError)
  }

  function showToast(message) {
    const toast = document.getElementById('toast')
    toast.textContent = message
    toast.classList.add('is-visible')
    window.clearTimeout(showToast.timeout)
    showToast.timeout = window.setTimeout(() => toast.classList.remove('is-visible'), 2800)
  }

  async function api(path, options = {}) {
    const token = sessionStorage.getItem('lazydiet_access_token')
    const headers = {...(options.headers || {})}
    if (token) headers.Authorization = `Bearer ${token}`
    if (options.body) headers['Content-Type'] = 'application/json'
    const baseUrl = (config.apiBaseUrl || '').replace(/\/$/, '')
    const response = await fetch(`${baseUrl}${path}`, {...options, headers})
    let result
    try {
      result = await response.json()
    } catch (error) {
      throw new Error('서버 응답을 읽을 수 없습니다.')
    }
    if (!response.ok || result.result === false) {
      const message = result.err?.errorMessage || result.error?.message || result.errorMessage
      if (
        response.status === 401 ||
        response.status === 403 ||
        (response.status === 400 && /token|bearer/i.test(message || ''))
      ) {
        logout('로그인 정보가 만료되었습니다. 다시 로그인해 주세요.')
      }
      throw new Error(message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
    return result.data
  }

  async function completeLogin(payload) {
    setStatus('로그인 확인 중...', false)
    document.querySelectorAll('.provider-button').forEach((button) => (button.disabled = true))
    try {
      const baseUrl = (config.apiBaseUrl || '').replace(/\/$/, '')
      const response = await fetch(`${baseUrl}/api/auth/social`, {
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
      await enterApp(result.data)
    } catch (error) {
      setStatus(error.message || '서버에 연결할 수 없습니다.')
    } finally {
      document.querySelectorAll('.provider-button').forEach((button) => (button.disabled = false))
    }
  }

  async function completeCredentialLogin(event) {
    event.preventDefault()
    const form = event.currentTarget
    const submitButton = form.querySelector('button[type="submit"]')
    const formData = new FormData(form)
    setStatus('로그인 확인 중...', false)
    submitButton.disabled = true
    try {
      const baseUrl = (config.apiBaseUrl || '').replace(/\/$/, '')
      const response = await fetch(`${baseUrl}/api/auth/signIn`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({user_id: formData.get('user_id'), user_pwd: formData.get('user_pwd')})
      })
      const result = await response.json()
      if (!response.ok || !result.result) {
        throw new Error(result.err?.errorMessage || '아이디 또는 비밀번호를 확인해 주세요.')
      }
      sessionStorage.setItem('lazydiet_access_token', result.token)
      sessionStorage.setItem('lazydiet_user', JSON.stringify(result.data))
      form.elements.user_pwd.value = ''
      await enterApp(result.data)
    } catch (error) {
      setStatus(error.message || '서버에 연결할 수 없습니다.')
    } finally {
      submitButton.disabled = false
    }
  }

  function startOAuth(provider) {
    const entry = providers[provider]
    if (!entry?.clientId) {
      setStatus(`${entry?.label || '로그인'} 설정이 아직 완료되지 않았습니다.`)
      return
    }
    const stateToken = randomState()
    sessionStorage.setItem(`lazydiet_oauth_state_${provider}`, stateToken)
    const authorizeUrls = {
      naver: `https://nid.naver.com/oauth2.0/authorize?${new URLSearchParams({
        client_id: entry.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        state: stateToken
      })}`,
      google: `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: entry.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid profile',
        state: stateToken
      })}`
    }
    window.location.assign(authorizeUrls[provider])
  }

  function startKakaoLogin() {
    if (!config.kakaoJavascriptKey || !window.Kakao?.Auth) {
      setStatus('카카오 로그인을 사용할 수 없습니다. JavaScript 키 설정을 확인해 주세요.')
      return
    }
    const stateToken = randomState()
    sessionStorage.setItem('lazydiet_oauth_state_kakao', stateToken)
    window.Kakao.Auth.authorize({redirectUri, state: stateToken})
  }

  async function startAppleLogin() {
    if (!providers.apple.clientId || !window.AppleID?.auth) {
      setStatus('Apple 로그인을 사용할 수 없습니다. 설정을 확인해 주세요.')
      return
    }
    const stateToken = randomState()
    try {
      window.AppleID.auth.init({
        clientId: providers.apple.clientId,
        scope: 'name email',
        redirectURI: redirectUri,
        state: stateToken,
        usePopup: true
      })
      const result = await window.AppleID.auth.signIn()
      if (result.authorization.state !== stateToken) throw new Error('Apple 로그인 상태를 확인할 수 없습니다.')
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
    const stateToken = params.get('state')
    const provider = Object.keys(providers).find(
      (key) => sessionStorage.getItem(`lazydiet_oauth_state_${key}`) === stateToken
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
    await completeLogin({provider, authorization_code: code, redirect_uri: redirectUri, oauth_state: stateToken})
  }

  function populateAssessmentOptions(options) {
    const daySelects = [document.getElementById('exercise-days'), ...document.querySelectorAll('.exercise-days-edit')]
    const goalSelects = [document.getElementById('profile-goal'), ...document.querySelectorAll('.profile-goal-edit')]
    daySelects.forEach((select) => {
      select.replaceChildren(new Option('횟수를 선택해 주세요', '', true, true))
      select.options[0].disabled = true
      for (let days = 0; days <= 7; days += 1) {
        const match = options.exercise_frequency_options.find((item) => days >= item.days_min && days <= item.days_max)
        const frequency = days === 0 ? '운동 안 함' : `주 ${days}회`
        select.add(new Option(`${frequency} · ${match.label}`, String(days)))
      }
    })
    goalSelects.forEach((select) => {
      select.replaceChildren(new Option('목표를 선택해 주세요', '', true, true))
      select.options[0].disabled = true
      options.goal_options.forEach((goal) => select.add(new Option(goal.label, goal.value)))
    })
  }

  function selectedGoal(profile) {
    if (profile.goal === 'lose') return 'diet'
    if (profile.goal === 'gain') return 'bulk'
    return profile.goal || 'maintain'
  }

  function fillProfileForm(form, profile) {
    if (!profile) return
    form.elements.sex.value = profile.sex
    form.elements.age.value = profile.age
    form.elements.height_cm.value = profile.height_cm
    form.elements.weight_kg.value = profile.weight_kg
    form.elements.exercise_days_per_week.value = String(profile.exercise_days_per_week ?? 0)
    form.elements.goal.value = selectedGoal(profile)
    form.elements.race.value = profile.race || 'asian'
  }

  async function enterApp(user) {
    loginView.hidden = true
    appView.hidden = false
    document.getElementById('user-name').textContent = user.user_name || user.user_id || '회원'
    document.getElementById('today-date').textContent = new Intl.DateTimeFormat('ko-KR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date())
    try {
      const [options, profileResult] = await Promise.all([
        api('/api/nutrition/activity-options'),
        api('/api/nutrition/profile')
      ])
      populateAssessmentOptions(options)
      state.profile = profileResult.profile
      document.getElementById('onboarding').hidden = Boolean(state.profile)
      document.getElementById('today-view').hidden = !state.profile
      if (state.profile) {
        await loadToday()
        addChatMessage(
          'assistant',
          '안녕하세요. 오늘의 식사 기록을 함께 살펴볼게요. 식사를 추가하거나 궁금한 점을 물어보세요.'
        )
      }
    } catch (error) {
      showToast(error.message)
    }
  }

  async function submitAssessment(form, errorId) {
    const errorMessage = document.getElementById(errorId)
    errorMessage.textContent = ''
    const formData = new FormData(form)
    const payload = {
      sex: formData.get('sex'),
      race: formData.get('race') || 'asian',
      age: Number(formData.get('age')),
      height_cm: Number(formData.get('height_cm')),
      weight_kg: Number(formData.get('weight_kg')),
      exercise_days_per_week: Number(formData.get('exercise_days_per_week')),
      goal: formData.get('goal')
    }
    try {
      const result = await api('/api/nutrition/activity-assessment', {method: 'POST', body: JSON.stringify(payload)})
      state.profile = result.profile
      document.getElementById('onboarding').hidden = true
      document.getElementById('today-view').hidden = false
      if (document.getElementById('profile-dialog').open) document.getElementById('profile-dialog').close()
      await loadToday()
      showToast('목표를 업데이트했어요.')
    } catch (error) {
      errorMessage.textContent = error.message
    }
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag)
    if (className) element.className = className
    if (text !== undefined) element.textContent = text
    return element
  }

  function renderProgress(day) {
    const target = day.targets?.calories || 0
    const consumed = day.consumed?.calories || 0
    const percent = target ? Math.round((consumed / target) * 100) : 0
    const ring = document.getElementById('calorie-ring')
    ring.style.setProperty('--progress', `${Math.min(percent, 100)}%`)
    ring.setAttribute('aria-label', `칼로리 달성률 ${percent}%`)
    document.getElementById('calories-consumed').textContent = Math.round(consumed).toLocaleString('ko-KR')
    document.getElementById('calories-target').textContent = target.toLocaleString('ko-KR')
    document.getElementById('calories-percent').textContent = `${percent}%`
    document.getElementById('calories-remaining').textContent = target
      ? `${Math.max(0, target - consumed).toLocaleString('ko-KR')} kcal 남음`
      : '프로필에서 목표를 설정해 주세요'
    document.getElementById('energy-note').textContent = day.profile
      ? `${day.profile.exercise_days_per_week ?? 0}회 운동 · ${
          day.profile.goal === 'lose' ? '다이어트' : day.profile.goal === 'gain' ? '벌크업' : '유지'
        } 목표`
      : '프로필에서 목표를 설정해 주세요.'

    const list = document.getElementById('nutrient-list')
    list.replaceChildren()
    Object.entries(nutrientNames).forEach(([key, [label, unit]]) => {
      const progress = day.progress?.[key]
      const consumedAmount = progress?.consumed ?? day.consumed?.[key] ?? 0
      const targetAmount = progress?.target ?? day.targets?.[key] ?? 0
      const percentage = targetAmount ? Math.round((consumedAmount / targetAmount) * 100) : 0
      const row = createElement('div', 'nutrient-row')
      const line = createElement('div', 'nutrient-line')
      const name = createElement('span', 'nutrient-name', label)
      const amount = createElement(
        'span',
        'nutrient-amount',
        `${formatAmount(consumedAmount)} / ${formatAmount(targetAmount)} ${unit}`
      )
      const track = createElement('div', 'nutrient-track')
      const fill = createElement('span', `nutrient-fill nutrient-${key}`)
      fill.style.width = `${Math.min(percentage, 100)}%`
      track.append(fill)
      line.append(name, amount)
      row.append(line, track)
      list.append(row)
    })
  }

  function formatAmount(value) {
    return Number(value || 0).toLocaleString('ko-KR', {maximumFractionDigits: 1})
  }

  function renderMeals(meals) {
    const list = document.getElementById('meal-list')
    list.replaceChildren()
    meals.forEach((meal) => {
      const isEmpty = meal.recorded === false || !meal.description
      const row = createElement('article', `meal-row${isEmpty ? ' is-empty' : ''}`)
      const marker = createElement(
        'span',
        `meal-marker meal-${meal.meal_type}`,
        meal.meal_type === 'snack' ? '간' : mealNames[meal.meal_type].slice(0, 1)
      )
      const details = createElement('div', 'meal-details')
      details.append(createElement('span', 'meal-name', mealNames[meal.meal_type]))
      details.append(createElement('span', 'meal-description', isEmpty ? '아직 기록이 없어요' : meal.description))
      const amount = createElement(
        'span',
        'meal-calories',
        isEmpty ? '기록하기 +' : `${Math.round(meal.calories)} kcal`
      )
      row.append(marker, details, amount)
      row.addEventListener('click', () => openMealDialog(isEmpty ? null : meal, meal.meal_type))
      list.append(row)
    })
  }

  async function loadToday() {
    const day = await api('/api/nutrition/day')
    state.day = day
    renderProgress(day)
    renderMeals(day.meals)
  }

  function openMealDialog(meal, mealType) {
    const dialog = document.getElementById('meal-dialog')
    const form = document.getElementById('meal-form')
    form.reset()
    document.getElementById('meal-error').textContent = ''
    form.elements.meal_date.value = state.day?.date || new Date().toLocaleDateString('en-CA')
    form.elements.meal_type.value = meal?.meal_type || mealType || 'breakfast'
    const deleteButton = document.getElementById('delete-meal')
    deleteButton.hidden = !meal
    if (meal) {
      ;['description', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sodium_mg'].forEach((key) => {
        form.elements[key].value = meal[key] ?? 0
      })
    }
    dialog.showModal()
  }

  async function saveMeal(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const payload = Object.fromEntries(data.entries())
    ;['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sodium_mg'].forEach((key) => {
      payload[key] = Number(payload[key] || 0)
    })
    try {
      await api('/api/nutrition/meal', {method: 'PUT', body: JSON.stringify(payload)})
      document.getElementById('meal-dialog').close()
      await loadToday()
      showToast('식사 기록을 저장했어요.')
    } catch (error) {
      document.getElementById('meal-error').textContent = error.message
    }
  }

  async function deleteMeal() {
    const form = document.getElementById('meal-form')
    const payload = {meal_date: form.elements.meal_date.value, meal_type: form.elements.meal_type.value}
    try {
      await api('/api/nutrition/meal', {method: 'DELETE', body: JSON.stringify(payload)})
      document.getElementById('meal-dialog').close()
      await loadToday()
      showToast('식사 기록을 삭제했어요.')
    } catch (error) {
      document.getElementById('meal-error').textContent = error.message
    }
  }

  function addChatMessage(type, text) {
    const messages = document.getElementById('chat-messages')
    const message = createElement('p', `chat-message ${type}`, text)
    messages.append(message)
    messages.scrollTop = messages.scrollHeight
  }

  async function sendChatMessage(text) {
    const message = text.trim()
    if (!message) return
    addChatMessage('user', message)
    document.getElementById('prompt-suggestions').hidden = true
    try {
      const result = await api('/api/nutrition/chat', {method: 'POST', body: JSON.stringify({message})})
      addChatMessage('assistant', result.response)
    } catch (error) {
      addChatMessage('assistant', error.message)
    }
  }

  function switchView(view) {
    const showHistory = view === 'history'
    document.getElementById('today-view').hidden = showHistory || !state.profile
    document.getElementById('history-view').hidden = !showHistory
    document
      .querySelectorAll('.nav-button')
      .forEach((button) => button.classList.toggle('is-active', button.dataset.view === view))
    if (showHistory) loadHistory(state.period)
  }

  async function loadHistory(period) {
    state.period = period
    document
      .querySelectorAll('[data-period]')
      .forEach((button) => button.classList.toggle('is-active', button.dataset.period === period))
    try {
      const query = `?period=${encodeURIComponent(period)}`
      const [history, analysis] = await Promise.all([
        api(`/api/nutrition/history${query}`),
        api(`/api/nutrition/analysis${query}`)
      ])
      state.history = history
      renderHistory(history, analysis)
    } catch (error) {
      showToast(error.message)
    }
  }

  function renderHistory(history, analysis) {
    const summary = document.getElementById('history-summary')
    summary.replaceChildren()
    const cards = [
      ['기록한 날', `${history.summary.logged_days}일`],
      ['남긴 끼니', `${history.summary.meal_count}끼`],
      ['하루 평균 열량', `${Math.round(history.summary.average.calories).toLocaleString('ko-KR')} kcal`],
      ['평균 단백질', `${formatAmount(history.summary.average.protein_g)} g`]
    ]
    cards.forEach(([label, value], index) => {
      const card = createElement('article', `summary-stat stat-${index + 1}`)
      card.append(createElement('span', 'summary-label', label), createElement('strong', 'summary-value', value))
      summary.append(card)
    })

    const insights = document.getElementById('insight-list')
    insights.replaceChildren()
    ;(analysis.insights || []).forEach((text) => {
      const item = createElement('li', '', text)
      insights.append(item)
    })

    const daysList = document.getElementById('history-days-list')
    daysList.replaceChildren()
    if (!history.days.length) {
      daysList.append(createElement('p', 'empty-state', '선택한 기간에는 아직 기록이 없어요.'))
      return
    }
    history.days.forEach((day) => {
      const row = createElement('article', 'history-day')
      const date = createElement('div', 'history-day-date')
      date.append(
        createElement('strong', '', formatDate(day.date)),
        createElement('span', '', `${day.meals.length}끼 기록`)
      )
      const metrics = createElement('div', 'history-day-metrics')
      metrics.append(createElement('strong', '', `${Math.round(day.consumed.calories).toLocaleString('ko-KR')} kcal`))
      metrics.append(
        createElement(
          'span',
          '',
          `단백질 ${formatAmount(day.consumed.protein_g)}g · 탄수화물 ${formatAmount(day.consumed.carbs_g)}g`
        )
      )
      const meter = createElement('div', 'history-meter')
      const fill = createElement('span')
      const calorieTarget = history.targets?.calories || 0
      fill.style.width = `${calorieTarget ? Math.min((day.consumed.calories / calorieTarget) * 100, 100) : 0}%`
      meter.append(fill)
      row.append(date, metrics, meter)
      daysList.append(row)
    })
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat('ko-KR', {month: 'long', day: 'numeric', weekday: 'short'}).format(
      new Date(`${date}T00:00:00`)
    )
  }

  function openProfileDialog() {
    fillProfileForm(document.getElementById('edit-profile-form'), state.profile)
    document.getElementById('edit-profile-error').textContent = ''
    document.getElementById('profile-dialog').showModal()
  }

  function logout(message = '로그아웃되었습니다.') {
    sessionStorage.removeItem('lazydiet_access_token')
    sessionStorage.removeItem('lazydiet_user')
    state.profile = null
    state.day = null
    appView.hidden = true
    loginView.hidden = false
    if (message) setStatus(message, false)
  }

  document.querySelectorAll('.provider-button').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.provider === 'kakao') startKakaoLogin()
      else if (button.dataset.provider === 'apple') startAppleLogin()
      else startOAuth(button.dataset.provider)
    })
  })
  document.getElementById('credential-form').addEventListener('submit', completeCredentialLogin)
  document.getElementById('logout-button').addEventListener('click', () => logout())
  document.getElementById('profile-form').addEventListener('submit', (event) => {
    event.preventDefault()
    submitAssessment(event.currentTarget, 'profile-error')
  })
  document.getElementById('edit-profile-form').addEventListener('submit', (event) => {
    event.preventDefault()
    submitAssessment(event.currentTarget, 'edit-profile-error')
  })
  document.getElementById('add-meal').addEventListener('click', () => openMealDialog())
  document.getElementById('meal-form').addEventListener('submit', saveMeal)
  document.getElementById('delete-meal').addEventListener('click', deleteMeal)
  document.getElementById('open-profile').addEventListener('click', openProfileDialog)
  document.getElementById('history-shortcut').addEventListener('click', () => switchView('history'))
  document
    .querySelectorAll('.nav-button')
    .forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)))
  document
    .querySelectorAll('[data-period]')
    .forEach((button) => button.addEventListener('click', () => loadHistory(button.dataset.period)))
  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => button.closest('dialog').close())
  })
  document.getElementById('chat-form').addEventListener('submit', (event) => {
    event.preventDefault()
    const input = document.getElementById('chat-input')
    const message = input.value
    input.value = ''
    sendChatMessage(message)
  })
  document.querySelectorAll('[data-prompt]').forEach((button) => {
    button.addEventListener('click', () => sendChatMessage(button.dataset.prompt))
  })

  handleOAuthCallback()
  try {
    const user = JSON.parse(sessionStorage.getItem('lazydiet_user') || 'null')
    if (sessionStorage.getItem('lazydiet_access_token') && user) enterApp(user)
  } catch (error) {
    sessionStorage.removeItem('lazydiet_user')
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => {})
})()
