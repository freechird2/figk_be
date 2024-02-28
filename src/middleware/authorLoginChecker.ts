import { NextFunction, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import { secretKey } from 'lib/jwt'
import { UnauthorizedError } from 'model/common/error'

export const authorLoginChecker = async (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization) {
        const token = req.headers.authorization.split('Bearer ')[1]

        try {
            const data: string | jwt.JwtPayload = await jwt.verify(token, secretKey)

            if (data['type'] !== 2) {
                throw new UnauthorizedError('작가만 접근이 가능합니다.')
            }

            if (data['idx']) {
                req.query.userId = data['idx']
                req.body.userId = data['idx']
                req.query.userType = data['type']
                req.body.userType = data['type']
            }

            next()
        } catch (error: any) {
            if (error instanceof UnauthorizedError) throw new UnauthorizedError(error.message)
            else throw new jwt.JsonWebTokenError(error.message === 'jwt expired' ? 'jwt expired' : 'invalid token')
        }
    } else {
        throw new UnauthorizedError('로그인이 필요합니다.')
    }
}
