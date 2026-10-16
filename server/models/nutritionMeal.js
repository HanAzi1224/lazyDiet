const {Sequelize, Model, DataTypes} = require('sequelize')
const {sequelize} = require('../loaders/sequelize')

class NutritionMeal extends Model {}

NutritionMeal.init(
  {
    nutrition_meal_idx: {type: DataTypes.BIGINT, primaryKey: true, allowNull: false, autoIncrement: true},
    user_idx: {type: DataTypes.BIGINT, allowNull: false},
    meal_date: {type: DataTypes.DATEONLY, allowNull: false},
    meal_type: {type: DataTypes.STRING(20), allowNull: false},
    description: {type: DataTypes.STRING(1000), allowNull: false},
    calories: {type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0},
    protein_g: {type: DataTypes.DECIMAL(7, 2), allowNull: false, defaultValue: 0},
    carbs_g: {type: DataTypes.DECIMAL(7, 2), allowNull: false, defaultValue: 0},
    fat_g: {type: DataTypes.DECIMAL(7, 2), allowNull: false, defaultValue: 0},
    fiber_g: {type: DataTypes.DECIMAL(7, 2), allowNull: false, defaultValue: 0},
    sodium_mg: {type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0},
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
    modelName: 'NutritionMeal',
    tableName: 'nutrition_meals',
    timestamps: true,
    createdAt: 'first_create_dt',
    updatedAt: 'last_update_dt',
    indexes: [{unique: true, fields: ['user_idx', 'meal_date', 'meal_type']}]
  }
)

module.exports = NutritionMeal
