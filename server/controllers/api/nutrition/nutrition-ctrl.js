const {Op} = require('sequelize')
const db = require('../../../models')
const openai = require('../../../components/openai')
const {
  calculateTargets,
  sumMeals,
  makeProgress,
  activityAssessmentOptions,
  goalOptions,
  assessActivity
} = require('../../../components/nutrition')

const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner']
const nutrientKeys = ['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sodium_mg']

function todayInSeoul() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({type, value}) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

function validateDate(date) {
  const parsedDate = new Date(`${date}T00:00:00Z`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw {status: 400, errorMessage: '날짜는 유효한 YYYY-MM-DD 형식이어야 합니다.'}
  }
}

function serializeMeal(meal) {
  const result = meal.get ? meal.get({plain: true}) : meal
  nutrientKeys.forEach((key) => {
    result[key] = Number(result[key] || 0)
  })
  return result
}

async function loadProfile(userIdx) {
  const profile = await db.NutritionProfile.findOne({where: {user_idx: userIdx}})
  if (!profile) return null
  const data = profile.get({plain: true})
  data.height_cm = Number(data.height_cm)
  data.weight_kg = Number(data.weight_kg)
  return {...data, targets: calculateTargets(data)}
}

async function buildDay(userIdx, date) {
  validateDate(date)
  const [profile, records] = await Promise.all([
    loadProfile(userIdx),
    db.NutritionMeal.findAll({where: {user_idx: userIdx, meal_date: date}, order: [['meal_type', 'ASC']]})
  ])
  const byType = new Map(records.map((record) => [record.meal_type, serializeMeal(record)]))
  const meals = mealTypes.map((mealType) => byType.get(mealType) || {meal_type: mealType, recorded: false})
  const consumed = sumMeals(records)
  const targets = profile?.targets || null

  return {
    date,
    profile,
    targets,
    meals,
    consumed,
    progress: makeProgress(consumed, targets)
  }
}

function periodBounds(period, anchorDate) {
  validateDate(anchorDate)
  if (period === 'all') return {from: null, to: null}

  const anchor = new Date(`${anchorDate}T00:00:00Z`)
  if (period === 'month') {
    const from = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1))
    const to = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0))
    return {from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10)}
  }

  const weekday = (anchor.getUTCDay() + 6) % 7
  const from = new Date(anchor)
  from.setUTCDate(anchor.getUTCDate() - weekday)
  const to = new Date(from)
  to.setUTCDate(from.getUTCDate() + 6)
  return {from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10)}
}

async function loadHistory(userIdx, period, anchorDate) {
  const bounds = periodBounds(period, anchorDate)
  const where = {user_idx: userIdx}
  if (bounds.from && bounds.to) where.meal_date = {[Op.between]: [bounds.from, bounds.to]}
  const records = await db.NutritionMeal.findAll({
    where,
    order: [
      ['meal_date', 'ASC'],
      ['meal_type', 'ASC']
    ]
  })
  const profile = await loadProfile(userIdx)
  const grouped = new Map()

  records.forEach((record) => {
    const meal = serializeMeal(record)
    if (!grouped.has(meal.meal_date)) grouped.set(meal.meal_date, [])
    grouped.get(meal.meal_date).push(meal)
  })

  const days = Array.from(grouped, ([date, meals]) => {
    const consumed = sumMeals(meals)
    return {date, meals, consumed, progress: makeProgress(consumed, profile?.targets || null)}
  })
  const total = sumMeals(records)
  const loggedDays = days.length
  const average = Object.fromEntries(
    nutrientKeys.map((key) => [key, loggedDays ? Math.round((total[key] / loggedDays) * 10) / 10 : 0])
  )

  return {
    period,
    from: bounds.from,
    to: bounds.to,
    targets: profile?.targets || null,
    summary: {logged_days: loggedDays, meal_count: records.length, total, average},
    days
  }
}

function buildInsights(day) {
  if (!day.profile) return ['먼저 나이, 성별, 키, 체중, 활동량과 목표를 등록해 주세요.']
  if (!day.consumed.calories) return ['오늘 기록이 아직 없어요. 식사와 영양성분을 첫 끼니부터 기록해 주세요.']

  const targets = day.targets
  const progress = day.progress
  const insights = []
  if (progress.protein_g.percent < 70)
    insights.push(
      `단백질이 목표의 ${progress.protein_g.percent}%예요. 달걀, 두부, 생선처럼 단백질이 있는 식품을 더해 보세요.`
    )
  if (progress.fiber_g.percent < 70)
    insights.push(`식이섬유가 목표의 ${progress.fiber_g.percent}%예요. 채소나 과일, 통곡물을 곁들이면 좋아요.`)
  if (progress.sodium_mg.percent > 100) insights.push('나트륨 목표를 넘었어요. 다음 끼니는 국물·절임류를 줄여 보세요.')
  if (progress.calories.percent < 75)
    insights.push(
      `현재 ${Math.max(
        0,
        targets.calories - day.consumed.calories
      )}kcal 정도 남았어요. 남은 끼니를 무리하게 줄이기보다 균형 있게 채워 보세요.`
    )
  if (insights.length === 0)
    insights.push('오늘 목표에 가까워지고 있어요. 현재 식사 패턴을 이어가고 물도 충분히 마셔 주세요.')
  return insights
}

module.exports.getProfile = async (req, res, next) => {
  try {
    const profile = await loadProfile(req.jwtToken.user_idx)
    return res.status(200).json({result: true, data: {profile, targets: profile?.targets || null}})
  } catch (err) {
    return next(err)
  }
}

module.exports.saveProfile = async (req, res, next) => {
  try {
    const userIdx = req.jwtToken.user_idx
    const {sex, race = 'asian', age, height_cm, weight_kg, activity_level, goal} = req.options
    const values = {user_idx: userIdx, sex, race, age, height_cm, weight_kg, activity_level, goal}
    await db.NutritionProfile.upsert(values)
    const profile = await loadProfile(userIdx)
    return res.status(200).json({result: true, data: {profile, targets: profile.targets}})
  } catch (err) {
    return next(err)
  }
}

module.exports.getActivityOptions = async (req, res) => {
  return res.status(200).json({
    result: true,
    data: {
      exercise_frequency_options: activityAssessmentOptions,
      goal_options: goalOptions.map(({value, label}) => ({value, label}))
    }
  })
}

module.exports.saveActivityAssessment = async (req, res, next) => {
  try {
    const userIdx = req.jwtToken.user_idx
    const {
      sex,
      race = 'asian',
      age,
      height_cm: heightCm,
      weight_kg: weightKg,
      exercise_days_per_week: exerciseDaysPerWeek,
      goal: selectedGoal
    } = req.options
    const activity = assessActivity(exerciseDaysPerWeek)
    const goalOption = goalOptions.find(({value}) => value === selectedGoal)
    const values = {
      user_idx: userIdx,
      sex,
      race,
      age,
      height_cm: heightCm,
      weight_kg: weightKg,
      exercise_days_per_week: exerciseDaysPerWeek,
      activity_level: activity.activity_level,
      goal: goalOption.goal
    }

    await db.NutritionProfile.upsert(values)
    const profile = await loadProfile(userIdx)
    return res.status(200).json({
      result: true,
      data: {
        profile,
        targets: profile.targets,
        assessment: {
          exercise_days_per_week: exerciseDaysPerWeek,
          activity_level: activity.activity_level,
          activity_multiplier: activity.multiplier,
          selected_goal: selectedGoal,
          goal: goalOption.goal
        }
      }
    })
  } catch (err) {
    return next(err)
  }
}

module.exports.getDay = async (req, res, next) => {
  try {
    const data = await buildDay(req.jwtToken.user_idx, req.options.date || todayInSeoul())
    return res.status(200).json({result: true, data})
  } catch (err) {
    return next(err)
  }
}

module.exports.saveMeal = async (req, res, next) => {
  try {
    const userIdx = req.jwtToken.user_idx
    const {meal_date: mealDate, meal_type: mealType, description} = req.options
    validateDate(mealDate)
    const values = {user_idx: userIdx, meal_date: mealDate, meal_type: mealType, description}
    nutrientKeys.forEach((key) => {
      values[key] = req.options[key] || 0
    })
    await db.NutritionMeal.upsert(values)
    const meal = await db.NutritionMeal.findOne({where: {user_idx: userIdx, meal_date: mealDate, meal_type: mealType}})
    const day = await buildDay(userIdx, mealDate)
    return res.status(200).json({result: true, data: {meal: serializeMeal(meal), day}})
  } catch (err) {
    return next(err)
  }
}

module.exports.deleteMeal = async (req, res, next) => {
  try {
    const {meal_date: mealDate, meal_type: mealType} = req.options
    validateDate(mealDate)
    const deleted = await db.NutritionMeal.destroy({
      where: {user_idx: req.jwtToken.user_idx, meal_date: mealDate, meal_type: mealType}
    })
    if (!deleted) throw {status: 404, errorMessage: '해당 날짜의 식사 기록을 찾을 수 없습니다.'}
    const day = await buildDay(req.jwtToken.user_idx, mealDate)
    return res.status(200).json({result: true, data: day})
  } catch (err) {
    return next(err)
  }
}

module.exports.getHistory = async (req, res, next) => {
  try {
    const {period = 'week', date = todayInSeoul()} = req.options
    const data = await loadHistory(req.jwtToken.user_idx, period, date)
    return res.status(200).json({result: true, data})
  } catch (err) {
    return next(err)
  }
}

module.exports.getAnalysis = async (req, res, next) => {
  try {
    const {period = 'week', date = todayInSeoul()} = req.options
    const history = await loadHistory(req.jwtToken.user_idx, period, date)
    const {logged_days: loggedDays, average} = history.summary
    const achievement = {}
    if (history.targets) {
      nutrientKeys.forEach((key) => {
        const expected = history.targets[key] * loggedDays
        achievement[key] = expected ? Math.round((history.summary.total[key] / expected) * 100) : 0
      })
    }
    const insights = []
    if (!loggedDays) insights.push('선택한 기간에 저장된 식사 기록이 없습니다.')
    else {
      if (achievement.protein_g < 80) insights.push('평균 단백질 섭취가 권장량에 미치지 못하고 있어요.')
      if (achievement.fiber_g < 80) insights.push('채소·과일·통곡물 등 식이섬유 식품을 더 자주 추가해 보세요.')
      if (achievement.sodium_mg > 100) insights.push('평균 나트륨 섭취가 목표를 넘었습니다.')
      if (insights.length === 0) insights.push('기록된 기간의 평균 영양 섭취가 목표 범위에 가까워요.')
    }
    return res.status(200).json({
      result: true,
      data: {
        period: history.period,
        from: history.from,
        to: history.to,
        logged_days: loggedDays,
        meal_count: history.summary.meal_count,
        average_daily_intake: average,
        targets: history.targets,
        achievement_percent: history.targets ? achievement : null,
        insights
      }
    })
  } catch (err) {
    return next(err)
  }
}

module.exports.chat = async (req, res, next) => {
  try {
    const date = req.options.date || todayInSeoul()
    const day = await buildDay(req.jwtToken.user_idx, date)
    const message = req.options.message.trim()
    const missingProfileMessage =
      '맞춤 식단 분석을 위해 나이, 성별, 키, 체중, 주간 운동 횟수와 목표를 먼저 등록해 주세요.'
    let response
    let aiPowered = false
    let fallbackReason

    if (!day.profile) {
      response = missingProfileMessage
      fallbackReason = 'profile_required'
    } else if (openai.isConfigured()) {
      try {
        response = await openai.generateNutritionReply(message, day)
        aiPowered = true
      } catch (error) {
        const errorCode = error.response?.data?.error?.code
        const quotaExhausted = errorCode === 'credit_balance_exhausted' || errorCode === 'insufficient_quota'
        const fallbackMessage = quotaExhausted
          ? 'OpenAI API 크레딧이 부족해 AI 코치를 사용할 수 없어요. 계정 결제를 확인해 주세요.'
          : 'AI 코치 연결이 잠시 원활하지 않아 저장된 기록을 기준으로 안내했어요.'
        response = `${buildInsights(day).join(' ')} ${fallbackMessage}`
        fallbackReason = quotaExhausted ? 'openai_quota_exhausted' : 'openai_unavailable'
      }
    } else {
      response = buildInsights(day).join(' ')
      fallbackReason = 'api_key_missing'
    }

    return res.status(200).json({
      result: true,
      data: {
        message,
        response,
        date,
        ai_powered: aiPowered,
        requires_external_ai: !openai.isConfigured(),
        missing_configuration: openai.isConfigured() ? [] : ['OPENAI_API_KEY'],
        fallback_reason: fallbackReason || null
      }
    })
  } catch (err) {
    return next(err)
  }
}
