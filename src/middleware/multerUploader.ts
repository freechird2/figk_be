import { S3Client } from '@aws-sdk/client-s3'
import { NextFunction, Request, Response } from 'express'
import { ConflictError } from 'model/common/error'
import multer from 'multer'
import multerS3 from 'multer-s3'
import path from 'path'
import { uploadFile } from 'sql/common/file'
import uuid4 from 'uuid4'

const uploadDirectory = {
    '/figk-studio/join': 'author/',
    '/figk-studio/profile': 'author/',
    '/figk-admin/art-figk': 'art-figk/',
    '/figk-admin/project': 'project/',
    '/zeroone-2023/program': 'zeroone-2023-program/',
    '/zeroone-2023/project': 'zeroone-2023-project/',
    // '/figk-admin/trend-figk': 'trend-figk/', [23.04.24 njw] trend figk 삭제
}

export const tuningDataUpload = multer({
    storage: multer.diskStorage({
        filename(req, file, done) {
            const randomID = uuid4()
            const ext = path.extname(file.originalname)
            const filename = randomID + ext
            done(null, filename)
        },
        destination(req, file, done) {
            done(null, 'uploads/')
        },
    }),
})

const s3 = new S3Client({
    region: process.env.S3_BUCKET_REGION,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
})

// S3 file deleter
// const s3GarbageCollector = async (ids: Array<number>) => {
//     if (!ids.length) return

//     try {
//         const fileList = await getFileListWithIdxs(ids)

//         if (fileList.length > 0) {
//             fileList.map(async (f) => {
//                 const data = await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: f.file_transed_name }))
//                 console.log(JSON.stringify(data, null, 4))
//             })
//         }
//     } catch (err) {
//         throw new ServerError(`Error[middleware/multerUploader/s3GarbageCollector] : ${err}`)
//     } finally {
//     }
// }

// S3 uploader
const fileUploader = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET,
        contentType: multerS3.AUTO_CONTENT_TYPE,

        key: (req: Request, file: Express.Multer.File, callback) => {
            const tempSplit = file.originalname.split('.')
            const fileExtension = tempSplit[tempSplit.length - 1]
            const fileTransed = `${uploadDirectory[req.baseUrl] || `common/`}${Date.now()}_${Math.floor(Math.random() * 99999)}`
            callback(null, `${fileTransed}.${fileExtension}`) // ex ) artfigk_2334123123.jpeg
        },
        acl: 'public-read',
    }),
})

// file DB insert
const insertFile = async (file: any) => {
    const tempSplit = file.originalname.split('.')

    const data = {
        fileTransedName: `${file.key}`,
        fileOriginName: file.originalname,
        fileExtension: file.originalname.split('.')[tempSplit.length - 1],
        fileSize: file.size,
    }

    return await uploadFile(data)
}

const uploadWrapper = {
    singleFileUploader: (multer: any) => {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                if (!multer) throw new ConflictError('파일 업로드 중 오류가 발생했어요.')
                await new Promise((resolve, reject) => {
                    multer(req, res, (err: unknown) => {
                        resolve(null)
                    })
                })
                next()
            } catch (err) {
                console.error(err)
            }
        }
    },
    multipleFileUploader: (multer: any) => {
        return async (req: Request, res: Response, next: NextFunction) => {
            const userId = req.body.userId
            const userType = req.body.userType
            if (!multer) {
                throw new ConflictError('파일 업로드 중 오류가 발생했어요.')
            }
            try {
                await new Promise((resolve, reject) => {
                    multer(req, res, (err: unknown) => {
                        resolve(null)
                    })
                })

                if (req.file) {
                    req.body[req.file.fieldname] = await insertFile(req.file)
                }

                if (req.files) {
                    // multiple upload
                    const files = {}

                    for (const file in req.files) {
                        const obj = req.files[file]

                        const idxArr = []

                        for (let i = 0; i < obj.length; i++) {
                            idxArr.push(await insertFile(obj[i]))
                        }

                        files[file] = idxArr
                    }

                    req.body.files = files
                }
                req.body.userId = userId
                req.body.userType = userType

                next()
            } catch (err) {
                console.error(err)
            }
        }
    },
}

export { fileUploader, insertFile, uploadWrapper }
