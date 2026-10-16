const activityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
}

const raceAdjustments = {
  asian: 0.96,
  caucasian: 1,
  african_american: 0.95,
  hispanic: 0.975
}

const activityAssessmentOptions = [
  {days_min: 0, days_max: 0, activity_level: 'sedentary', multiplier: 1.2, label: '운동하지 않음'},
  {days_min: 1, days_max: 2, activity_level: 'light', multiplier: 1.375, label: '주 1~2회'},
  {days_min: 3, days_max: 4, activity_level: 'moderate', multiplier: 1.55, label: '주 3~4회'},
  {days_min: 5, days_max: 6, activity_level: 'active', multiplier: 1.725, label: '주 5~6회'},
  {days_min: 7, days_max: 7, activity_level: 'very_active', multiplier: 1.9, label: '매일'}
]

const goalOptions = [
  {value: 'diet', goal: 'lose', label: '다이어트'},
  {value: 'maintain', goal: 'maintain', label: '유지'},
  {value: 'bulk', goal: 'gain', label: '벌크업'}
]

function assessActivity(exerciseDaysPerWeek) {
  return activityAssessmentOptions.find(
    ({days_min: daysMin, days_max: daysMax}) => exerciseDaysPerWeek >= daysMin && exerciseDaysPerWeek <= daysMax
  )
}

function calculateTargets(profile) {
  const weightKg = Number(profile.weight_kg)
  const heightCm = Number(profile.height_cm)
  const age = Number(profile.age)
  const sexAdjustment = profile.sex === 'male' ? 5 : profile.sex === 'female' ? -161 : -78
  const baseBmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexAdjustment
  const bmr = baseBmr * (raceAdjustments[profile.race || 'asian'] || 1)
  const maintenanceCalories = bmr * activityMultipliers[profile.activity_level]
  const goalAdjustment = profile.goal === 'lose' ? -500 : profile.goal === 'gain' ? 300 : 0
  const calories = Math.max(bmr, maintenanceCalories + goalAdjustment)
  const protein = weightKg * 1.6
  const fat = weightKg * 0.8
  const carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4)

  return {
    bmr: Math.round(bmr),
    maintenance_calories: Math.round(maintenanceCalories),
    calories: Math.round(calories),
    protein_g: Math.round(protein),
    carbs_g: Math.round(carbs),
    fat_g: Math.round(fat),
    fiber_g: Math.round((calories / 1000) * 14),
    sodium_mg: 2000
  }
}

function sumMeals(meals) {
  return meals.reduce(
    (total, meal) => {
      total.calories += Number(meal.calories || 0)
      total.protein_g += Number(meal.protein_g || 0)
      total.carbs_g += Number(meal.carbs_g || 0)
      total.fat_g += Number(meal.fat_g || 0)
      total.fiber_g += Number(meal.fiber_g || 0)
      total.sodium_mg += Number(meal.sodium_mg || 0)
      return total
    },
    {calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sodium_mg: 0}
  )
}

function makeProgress(consumed, targets) {
  if (!targets) return null
  return Object.fromEntries(
    Object.keys(consumed).map((nutrient) => [
      nutrient,
      {
        consumed: Math.round(consumed[nutrient] * 10) / 10,
        target: targets[nutrient],
        percent: targets[nutrient] > 0 ? Math.round((consumed[nutrient] / targets[nutrient]) * 100) : 0
      }
    ])
  )
}

module.exports = {calculateTargets, sumMeals, makeProgress, activityAssessmentOptions, goalOptions, assessActivity}
