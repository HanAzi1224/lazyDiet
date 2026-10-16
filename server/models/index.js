const Sequelize = require('sequelize')
const {sequelize} = require('../loaders/sequelize')

const db = {}

db.sequelize = sequelize
db.Sequelize = Sequelize

module.exports = db

const Users = require('./users')
const UserAuth = require('./userAuth')
const SocialAuth = require('./socialAuth')
const NutritionProfile = require('./nutritionProfile')
const NutritionMeal = require('./nutritionMeal')

db.Users = Users
db.UserAuth = UserAuth
db.SocialAuth = SocialAuth
db.NutritionProfile = NutritionProfile
db.NutritionMeal = NutritionMeal

// Users와 UserAuth 관계
db.Users.hasOne(db.UserAuth, {as: 'user_auth', foreignKey: 'user_idx'})
db.UserAuth.belongsTo(db.Users, {as: 'users', foreignKey: 'user_idx'})
db.Users.hasMany(db.SocialAuth, {as: 'social_auths', foreignKey: 'user_idx'})
db.SocialAuth.belongsTo(db.Users, {as: 'users', foreignKey: 'user_idx'})
db.Users.hasOne(db.NutritionProfile, {as: 'nutrition_profile', foreignKey: 'user_idx'})
db.NutritionProfile.belongsTo(db.Users, {as: 'users', foreignKey: 'user_idx'})
db.Users.hasMany(db.NutritionMeal, {as: 'nutrition_meals', foreignKey: 'user_idx'})
db.NutritionMeal.belongsTo(db.Users, {as: 'users', foreignKey: 'user_idx'})
