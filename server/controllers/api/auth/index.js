/**
 * Authentication API Routes Module
 *
 * This module defines API endpoints for user authentication processes.
 * All endpoints are configured with Swagger documentation metadata and
 * are publicly accessible (no authentication required).
 *
 * Swagger Configuration:
 * - All endpoints are grouped under '인증' (Authentication) tag
 * - Request/Response schemas are automatically validated and documented
 * - HTTP response codes and descriptions are defined for each endpoint
 * - isPublic: true - allows unauthenticated access
 * - apiType: ['user'] - categorizes as user-facing APIs
 */

// Import dependencies for API routing and authentication controllers
const ApiRouter = require('../../default').ApiRouter
const ctrl = require('./auth-ctrl')
const socialAuthCtrl = require('./social-auth-ctrl')

// User registration endpoint - allows new users to create an account
module.exports.signUp = new ApiRouter({
  name: 'signUp',
  method: 'post',
  schema: 'request/auth/SignUp',
  summary: '회원가입',
  tags: ['인증'],
  isPublic: true,
  apiType: ['user'],
  responses: {
    200: {description: 'Success'},
    400: {description: 'Invalid data'}
  },
  handler: ctrl.signUp
})

// User authentication endpoint - validates credentials and creates user session
module.exports.signIn = new ApiRouter({
  name: 'signIn',
  method: 'post',
  summary: '로그인',
  schema: 'request/auth/SignIn',
  tags: ['인증'],
  isPublic: true,
  apiType: ['user'],
  responses: {
    200: {description: 'Success'},
    400: {description: 'Invalid data'},
    401: {description: '비밀번호가 올바르지 않습니다.'},
    404: {description: '사용자를 찾을 수 없습니다.'}
  },
  handler: ctrl.signIn
})

module.exports.socialSignIn = new ApiRouter({
  name: 'social',
  method: 'post',
  schema: 'request/auth/SocialSignIn',
  summary: 'SNS 로그인',
  tags: ['인증'],
  isPublic: true,
  apiType: ['user'],
  responses: {
    200: {description: 'Success'},
    400: {description: 'Invalid data'},
    401: {description: '유효하지 않은 SNS 토큰입니다.'},
    502: {description: 'SNS 사용자 정보를 확인할 수 없습니다.'}
  },
  handler: socialAuthCtrl.signIn
})

// User ID availability check - verifies if a username is available for registration
module.exports.checkUserId = new ApiRouter({
  name: 'check',
  method: 'post',
  schema: 'request/auth/CheckUserId',
  summary: '아이디 중복 체크',
  tags: ['인증'],
  isPublic: true,
  apiType: ['user'],
  responses: {
    200: {description: 'Success - Available ID'},
    409: {description: '이미 존재하는 아이디입니다.'},
    400: {description: 'Invalid data'}
  },
  handler: ctrl.checkUserId
})

// User ID recovery endpoint - helps users find their username using personal information
module.exports.findUserId = new ApiRouter({
  name: 'find/id',
  method: 'post',
  schema: 'request/auth/FindUserId',
  summary: '아이디 찾기',
  tags: ['인증'],
  isPublic: true,
  apiType: ['user'],
  responses: {
    200: {description: 'Success'},
    400: {description: 'Invalid data'}
  },
  handler: ctrl.findUserId
})
