const {Sequelize, Model, DataTypes} = require('sequelize')
const {sequelize} = require('../loaders/sequelize')

class NutritionProfile extends Model {}

NutritionProfile.init(
  {
    nutrition_profile_idx: {type: DataTypes.BIGINT, primaryKey: true, allowNull: false, autoIncrement: true},
    user_idx: {type: DataTypes.BIGINT, allowNull: false, unique: true},
    sex: {type: DataTypes.STRING(10), allowNull: false},
    race: {type: DataTypes.STRING(30), allowNull: false, defaultValue: 'asian'},
    age: {type: DataTypes.INTEGER, allowNull: false},
    height_cm: {type: DataTypes.DECIMAL(5, 2), allowNull: false},
    weight_kg: {type: DataTypes.DECIMAL(5, 2), allowNull: false},
    activity_level: {type: DataTypes.STRING(20), allowNull: false},
    exercise_days_per_week: {type: DataTypes.INTEGER, allowNull: true},
    goal: {type: DataTypes.STRING(20), allowNull: false},
    first_create_dt: {type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')},
    last_update_dt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  },
  {
    sequelize,
    modelName: 'NutritionProfile',
    tableName: 'nutrition_profiles',
    timestamps: true,
    createdAt: 'first_create_dt',
    updatedAt: 'last_update_dt'
  }
)

module.exports = NutritionProfile
