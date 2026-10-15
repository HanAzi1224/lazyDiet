const {Sequelize, Model, DataTypes} = require('sequelize')
const {sequelize} = require('../loaders/sequelize')

class SocialAuth extends Model {}

SocialAuth.init(
  {
    social_auth_idx: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    },
    user_idx: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    provider: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    provider_user_id: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    first_create_dt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    last_update_dt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    delete_dt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'SocialAuth',
    tableName: 'social_auth',
    timestamps: true,
    createdAt: 'first_create_dt',
    updatedAt: 'last_update_dt',
    deletedAt: 'delete_dt',
    paranoid: true,
    indexes: [{unique: true, fields: ['provider', 'provider_user_id']}]
  }
)

module.exports = SocialAuth
