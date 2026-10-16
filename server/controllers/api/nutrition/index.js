const ApiRouter = require('../../default').ApiRouter
const ctrl = require('./nutrition-ctrl')

module.exports.getProfile = new ApiRouter({
  name: 'profile',
  method: 'get',
  schema: 'request/common/None',
  summary: '영양 프로필 및 권장량 조회',
  tags: ['식단'],
  apiType: ['user'],
  handler: ctrl.getProfile
})

module.exports.saveProfile = new ApiRouter({
  name: 'profile',
  method: 'put',
  schema: 'request/nutrition/Profile',
  summary: '영양 프로필 저장 및 권장량 계산',
  tags: ['식단'],
  apiType: ['user'],
  handler: ctrl.saveProfile
})

module.exports.getActivityOptions = new ApiRouter({
  name: 'activity-options',
  method: 'get',
  schema: 'request/common/None',
  summary: '운동 횟수 및 목표 선택지 조회',
  tags: ['식단'],
  apiType: ['user'],
  handler: ctrl.getActivityOptions
})

module.exports.saveActivityAssessment = new ApiRouter({
  name: 'activity-assessment',
  method: 'post',
  schema: 'request/nutrition/ActivityAssessment',
  summary: '주간 운동 횟수 기반 활동 수준 및 목표 등록',
  tags: ['식단'],
  apiType: ['user'],
  handler: ctrl.saveActivityAssessment
})

module.exports.getDay = new ApiRouter({
  name: 'day',
  method: 'get',
  schema: 'request/nutrition/Day',
  summary: '하루 식단 및 영양 달성률 조회',
  tags: ['식단'],
  apiType: ['user'],
  handler: ctrl.getDay
})

module.exports.saveMeal = new ApiRouter({
  name: 'meal',
  method: 'put',
  schema: 'request/nutrition/Meal',
  summary: '날짜별 끼니 기록 저장 또는 갱신',
  tags: ['식단'],
  apiType: ['user'],
  handler: ctrl.saveMeal
})

module.exports.deleteMeal = new ApiRouter({
  name: 'meal',
  method: 'delete',
  schema: 'request/nutrition/DeleteMeal',
  summary: '날짜별 끼니 기록 삭제',
  tags: ['식단'],
  apiType: ['user'],
  handler: ctrl.deleteMeal
})

module.exports.getHistory = new ApiRouter({
  name: 'history',
  method: 'get',
  schema: 'request/nutrition/History',
  summary: '주간·월간·전체 식단 기록 조회',
  tags: ['식단'],
  apiType: ['user'],
  handler: ctrl.getHistory
})

module.exports.getAnalysis = new ApiRouter({
  name: 'analysis',
  method: 'get',
  schema: 'request/nutrition/History',
  summary: '주간·월간·전체 영양 섭취 분석',
  tags: ['식단'],
  apiType: ['user'],
  handler: ctrl.getAnalysis
})

module.exports.chat = new ApiRouter({
  name: 'chat',
  method: 'post',
  schema: 'request/nutrition/Chat',
  summary: '식단 질문 및 영양 피드백',
  tags: ['식단'],
  apiType: ['user'],
  handler: ctrl.chat
})
