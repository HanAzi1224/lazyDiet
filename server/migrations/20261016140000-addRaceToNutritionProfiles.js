/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('nutrition_profiles', 'race', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'asian'
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('nutrition_profiles', 'race')
  }
}
