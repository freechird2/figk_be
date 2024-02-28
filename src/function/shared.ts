import crypto from 'crypto'
import { getTransporter } from 'lib/transporter'
import { ServerError } from 'model/common/error'
import { SendMailOptions, SentMessageInfo } from 'nodemailer'

export const sqlFetch = async (db: any, sql: string, path: string): Promise<any> => {
    try {
        const res = await db.query(sql).catch(() => {
            return false
        })

        return res && res.length > 0 ? (Array.isArray(res[0]) ? res[0][0] : res[0]) : null
    } catch (err) {
        console.log(`Error[sql/${path}] : ${err}`)
    }

    return null
}

// page와 per 로 limit sql 만들어주는 함수
export const attachOffsetLimit = (page: number, per: number) => {
    if (!page || !per) return ''
    else {
        const offset = Number(page - 1) * Number(per)
        return ` LIMIT ${offset}, ${Number(per)}`
    }
}

// 비밀번호 암호화 공통 함수
export const createCrytoPassword = (password: string) => {
    return crypto.createHmac('sha256', process.env.CRYPTO_KEY).update(password).digest('hex')
}

export const filledParam = (param: object) => {
    let tempArr = ['id', 'page', 'per', 'week', 'authorId']
    let tempObj = {}

    if (!param) {
        return {}
    }

    for (const key in param) {
        if (!param[key]) continue

        if (tempArr.includes(key)) {
            tempObj[key] = Number(param[key])
        } else {
            tempObj[key] = param[key]
        }
    }
    return tempObj
}

// 메일 전송
export const sendMail = async (option: SendMailOptions) => {
    try {
        const transporter = await getTransporter()

        const info: SentMessageInfo = await transporter.sendMail(option)

        return info
    } catch (err) {
        throw new ServerError('메일 전송 중 오류가 발생했습니다.')
    }
}
