import { NextFunction, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'

import { secretKey } from 'lib/jwt'
import { UnauthorizedError } from 'model/common/error'

export const refreshChecker = async (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization) {
        const token = req.headers.authorization.split('Bearer ')[1]

        try {
            const data: string | jwt.JwtPayload = jwt.verify(token, secretKey)

            if (data['type'] !== 0 && data['type'] !== 1) {
                throw new UnauthorizedError('관리자만 접근이 가능합니다.')
            }

            const memberNo = data['idx']
            const memberType = data['type']
            const isForever = data['forever']
            const tokenType = data['token_type']

            if (tokenType !== 'refresh') {
                throw new jwt.JsonWebTokenError('invalid token')
            }

            req.body.userId = memberNo
            req.body.userType = memberType
            req.body.isForever = isForever

            next()
        } catch (error) {
            if (error instanceof UnauthorizedError) throw new UnauthorizedError(error.message)
            else throw new jwt.JsonWebTokenError(error.message === 'jwt expired' ? 'jwt expired' : 'invalid token')
        }
    } else {
        throw new UnauthorizedError('로그인이 필요합니다.')
    }
}
