const fs = require('fs')

const S3GARBAGE_PATH = '../../logs/s3garbage'
const S3GARBAGE_FILENAME = '/s3garbage.json'

export const saveS3Garbage = (keys: Array<string>) => {
    if (!keys || keys.length < 1) return

    try {
        if (!fs.existsSync(S3GARBAGE_PATH)) {
            fs.mkdirSync(S3GARBAGE_PATH)
        }

        if (!fs.existsSync(S3GARBAGE_PATH + S3GARBAGE_FILENAME)) {
            fs.writeFileSync(S3GARBAGE_PATH + S3GARBAGE_FILENAME, JSON.stringify({ garbage: [] }))
        }

        const json = fs.readFileSync(S3GARBAGE_PATH + S3GARBAGE_FILENAME, 'utf-8')
        const garbage: Array<any> = JSON.parse(json).garbage

        keys.map((k) => {
            garbage.push({ key: k })
        })

        fs.writeFileSync(S3GARBAGE_PATH + S3GARBAGE_FILENAME, JSON.stringify({ garbage }), 'utf-8')
    } catch (error) {
        console.log('[s3garbage log error]')
    }
}
