/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('nutrition_profiles', 'exercise_days_per_week', {
      type: Sequelize.INTEGER,
      allowNull: true
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('nutrition_profiles', 'exercise_days_per_week')
  }
}
