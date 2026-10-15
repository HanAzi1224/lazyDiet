const {Sequelize, Model, DataTypes} = require('sequelize')
const {sequelize} = require('../loaders/sequelize')

class Users extends Model {}

Users.init(
  {
    user_idx: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
      comment: '인덱스'
    },
    user_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '유저ID'
    },
    user_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '유저 이름'
    },
    user_phone: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '휴대폰번호'
    },
    fcm_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'fcm token'
    },
    first_create_dt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: '등록일'
    },
    last_update_dt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      onUpdate: Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: '수정일'
    },
    delete_dt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '삭제일'
    }
  },
  {
    sequelize,
    modelName: 'Users',
    tableName: 'users',
    timestamps: true,
    createdAt: 'first_create_dt',
    updatedAt: 'last_update_dt',
    deletedAt: 'delete_dt',
    paranoid: true
  }
)

module.exports = Users
