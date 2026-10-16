/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('nutrition_profiles', {
      nutrition_profile_idx: {type: Sequelize.BIGINT, primaryKey: true, allowNull: false, autoIncrement: true},
      user_idx: {type: Sequelize.BIGINT, allowNull: false, unique: true},
      sex: {type: Sequelize.STRING(10), allowNull: false},
      age: {type: Sequelize.INTEGER, allowNull: false},
      height_cm: {type: Sequelize.DECIMAL(5, 2), allowNull: false},
      weight_kg: {type: Sequelize.DECIMAL(5, 2), allowNull: false},
      activity_level: {type: Sequelize.STRING(20), allowNull: false},
      goal: {type: Sequelize.STRING(20), allowNull: false},
      first_create_dt: {type: 'TIMESTAMP', allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')},
      last_update_dt: {
        type: 'TIMESTAMP',
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        onUpdate: 'CURRENT_TIMESTAMP'
      }
    })

    await queryInterface.createTable('nutrition_meals', {
      nutrition_meal_idx: {type: Sequelize.BIGINT, primaryKey: true, allowNull: false, autoIncrement: true},
      user_idx: {type: Sequelize.BIGINT, allowNull: false},
      meal_date: {type: Sequelize.DATEONLY, allowNull: false},
      meal_type: {type: Sequelize.STRING(20), allowNull: false},
      description: {type: Sequelize.STRING(1000), allowNull: false},
      calories: {type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0},
      protein_g: {type: Sequelize.DECIMAL(7, 2), allowNull: false, defaultValue: 0},
      carbs_g: {type: Sequelize.DECIMAL(7, 2), allowNull: false, defaultValue: 0},
      fat_g: {type: Sequelize.DECIMAL(7, 2), allowNull: false, defaultValue: 0},
      fiber_g: {type: Sequelize.DECIMAL(7, 2), allowNull: false, defaultValue: 0},
      sodium_mg: {type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0},
      first_create_dt: {type: 'TIMESTAMP', allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')},
      last_update_dt: {
        type: 'TIMESTAMP',
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        onUpdate: 'CURRENT_TIMESTAMP'
      }
    })
    await queryInterface.addIndex('nutrition_meals', ['user_idx', 'meal_date', 'meal_type'], {
      unique: true,
      name: 'nutrition_meals_user_date_type_unique'
    })
    await queryInterface.addIndex('nutrition_meals', ['user_idx', 'meal_date'], {
      name: 'nutrition_meals_user_date_index'
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('nutrition_meals')
    await queryInterface.dropTable('nutrition_profiles')
  }
}
