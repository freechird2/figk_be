import jwt from 'jsonwebtoken'
import { ServerError } from 'model/common/error'
import { userModel } from 'model/user/user'

export const secretKey = process.env.SECRET_KEY as string
// Public
export const createAccessToken = async (data: userModel) => {
    return data.id ? await createToken('access', data) : null
}

export const createRefreshToken = async (data: userModel, isForever: boolean) => {
    return data.id ? await createToken('refresh', data, isForever) : null
}

// Private
const createToken = async (type: 'refresh' | 'access', data: userModel, isForever?: boolean) => {
    try {
        const payLoad = {
            idx: data.id,
            type: data.type,
            forever: isForever ? true : false,
            token_type: type,
        }

        const options: jwt.SignOptions = {
            algorithm: 'HS256', // 해싱 알고리즘
            expiresIn: type === 'refresh' ? (isForever ? '365d' : '1d') : '12h', // 토큰 유효 기간
            issuer: 'fig', // 발행자
        }

        return jwt.sign(payLoad, secretKey, options)
    } catch (error) {
        throw new ServerError(`Error[lib/jwt/createToken] : ${error}`)
    }
}
