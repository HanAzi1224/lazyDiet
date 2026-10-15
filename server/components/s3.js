const fs = require('fs')
const _ = require('lodash')
const Jimp = require('jimp')
const config = require('../config/index')
const AWS = require('./aws')

const s3 = new AWS.S3()

module.exports.generatePreSignedUrl = (options) => {
  const {key, mimetype} = options
  const bucket = config.aws.s3[process.env.NAME]?.bucket || config.aws.s3.bucket
  const params = {
    Bucket: bucket,
    Key: key,
    ContentType: mimetype,
    ACL: 'public-read',
    Metadata: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    },
    Expires: 60
  }
  try {
    return s3.getSignedUrl('putObject', params)
  } catch (e) {
    throw e
  }
}
module.exports.s3UploadBase64 = async (options) => {
  try {
    const regex = /^data:image\/\w+;base64,/
    const buf = new Buffer.alloc(options.file.replace(regex, ''), 'base64')
    const params = {
      Bucket: config.aws.s3.bucket,
      Key: options.key,
      Body: buf,
      ContentEncoding: 'base64',
      ContentType: options.mimetype,
      Metadata: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      ACL: 'public-read'
    }
    await s3.putObject(params).promise()
    return `${config.aws.s3.host}/${options.key}`
  } catch (err) {
    throw err
  }
}

module.exports.s3UploadFile = async (options) => {
  return await s3UploadFile(options)
}

async function s3UploadFile(options) {
  try {
    const params = {
      Bucket: config.aws.s3.bucket,
      Key: options.key,
      Body: fs.createReadStream(options.path),
      ContentType: options.mimetype,
      ACL: 'public-read'
    }

    await s3.putObject(params).promise()
    return options.key
  } catch (err) {
    throw err
  }
}

module.exports.getImageAndResizeImageBuffer = async (options) => {
  return await getImageAndResizeImageBuffer(options)
}

/**
 *
 * @param options
 * @param isCrop : true면 정사각형으로 자른다
 * @returns {Promise<{imgBufArray: Array, key: Array}>}
 */
async function getImageAndResizeImageBuffer(options) {
  try {
    const imgBufArray = []
    const key = []

    const image = await Jimp.read(options.path)
    if (options.isCrop) {
      let x = 0,
        y = 0,
        size = 0
      if (image.bitmap.width > image.bitmap.height) {
        x = (image.bitmap.width - image.bitmap.height) / 2
        size = image.bitmap.height
      }

      if (image.bitmap.width < image.bitmap.height) {
        y = (image.bitmap.height - image.bitmap.width) / 2
        size = image.bitmap.width
      }

      let cropImage = null
      if (size !== 0) {
        cropImage = await image.crop(x, y, size, size)
      } else {
        cropImage = image
      }
      const buffer = await getImageBuffer(cropImage)

      imgBufArray.push(buffer)
      key.push(options.key)
    } else {
      const buffer = await getImageBuffer(image)
      imgBufArray.push(buffer)
      key.push(options.key)
    }

    if (!options.width) options.width = Jimp.AUTO
    if (!options.height) options.height = Jimp.AUTO

    const resizeImage = await image.resize(options.width, options.height)
    const buffer = await getImageBuffer(resizeImage)

    imgBufArray.push(buffer)
    key.push(`${options.key}_thumb`)

    return {imgBufArray, key}
  } catch (err) {
    throw err
  }
}

function getImageBuffer(image) {
  return new Promise((resolve, reject) => {
    image.getBuffer(image.getMIME(), (err, buffer) => {
      if (err) {
        reject(err)
      }
      resolve(buffer)
    })
  })
}

module.exports.s3UploadNomalAndResizeImage = async (options) => {
  try {
    const {imgBufArray, key} = await getImageAndResizeImageBuffer(options)

    let params = null
    let imgBuf = null
    for (let i = 0; i < imgBufArray.length; i++) {
      imgBuf = imgBufArray[i]
      params = {
        Bucket: config.aws.s3.bucket,
        Key: key[i],
        Body: imgBuf,
        // Body: fs.createReadStream(options.path),
        ContentType: options.mimetype,
        ACL: 'public-read'
      }

      await s3.putObject(params).promise()
    }

    return options.key
  } catch (err) {
    throw err
  }
}

module.exports.s3DeleteFiles = async (keys) => {
  const Objects = keys.map((Key) => {
    return {Key}
  })

  const params = {
    Bucket: config.aws.s3.bucket,
    Delete: {Objects}
  }
  try {
    return await s3.deleteObjects(params).promise()
  } catch (e) {
    throw e
  }
}

module.exports.s3DeleteNomalAndResizeImage = async (keys) => {
  if (!keys.length) return Promise.resolve()

  const Objects = keys.reduce((arr, Key) => {
    arr.push({Key})
    const pathArr = Key.split('.')
    const thumbnail = `${pathArr[0]}_thumb`
    arr.push({Key: thumbnail})
    return arr
  }, [])

  const params = {
    Bucket: config.aws.s3.bucket,
    Delete: {Objects}
  }
  try {
    return await s3.deleteObjects(params).promise()
  } catch (e) {
    throw e
  }
}
