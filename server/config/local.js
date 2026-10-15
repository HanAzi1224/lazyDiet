// number should be converted from string first
const srvPort = Number(process.env.PORT || '4000')

const dbHost = process.env.MYSQL_HOST
const dbName = process.env.MYSQL_DATABASE
const dbUser = process.env.MYSQL_USER
const dbPass = process.env.MYSQL_PASSWORD
const dbPort = process.env.MYSQL_PORT

module.exports = {
  PORT: srvPort,
  database: {
    host: dbHost,
    username: dbUser,
    password: dbPass,
    database: dbName,
    port: dbPort || '3306',
    dialect: 'mysql',
    timezone: 'Asia/Seoul',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: console.log
  },
  aws: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    s3: {
      host: 'https://lazy-diet.s3.ap-northeast-2.amazonaws.com',
      bucket: 'lazy-diet',
      frontPath: 'https://lazy-diet.s3.ap-northeast-2.amazonaws.com/files/',
      originUserImage: 'original',
      thumbnailUserImage: 'thumbnails'
    }
  },
  swagger: {
    id: 'tew',
    password: '201106'
  },
  redis: {
    host: 'localhost',
    port: 6379
  }
}
