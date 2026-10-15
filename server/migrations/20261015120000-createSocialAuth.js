/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const userColumns = await queryInterface.describeTable('users')
    if (userColumns.user_phone.allowNull === false) {
      await queryInterface.changeColumn('users', 'user_phone', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: '휴대폰번호'
      })
    }

    await queryInterface.createTable('social_auth', {
      social_auth_idx: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true
      },
      user_idx: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      provider: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      provider_user_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      first_create_dt: {
        type: 'TIMESTAMP',
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      last_update_dt: {
        type: 'TIMESTAMP',
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        onUpdate: 'CURRENT_TIMESTAMP'
      },
      delete_dt: {
        type: 'TIMESTAMP',
        allowNull: true
      }
    })
    await queryInterface.addIndex('social_auth', ['provider', 'provider_user_id'], {
      unique: true,
      name: 'social_auth_provider_user_id_unique'
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('social_auth')
    await queryInterface.bulkUpdate('users', {user_phone: ''}, {user_phone: null})
    await queryInterface.changeColumn('users', 'user_phone', {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment: '휴대폰번호'
    })
  }
}
