import { NextFunction, Request, Response } from 'express'
import { JsonWebTokenError } from 'jsonwebtoken'
import { BadRequestError, ConflictError, ServerError, UnauthorizedError } from 'model/common/error'
import { logger } from '../../config/logger'

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof BadRequestError) {
        res.status(400).json({ code: 400, message: err.message, data: null })
    } else if (err instanceof UnauthorizedError) {
        res.status(401).json({ code: 401, message: err.message, data: null })
    } else if (err instanceof ConflictError) {
        res.status(409).json({ code: 409, message: err.message, data: null })
    } else if (err instanceof JsonWebTokenError) {
        if (err.message === 'jwt expired') {
            res.json({ code: 40002, message: '토큰이 만료되었습니다', data: null })
        } else {
            res.json({ code: 40001, message: '유효하지 않은 토큰정보 입니다', data: null })
        }
    } else if (err instanceof ServerError) {
        console.log(err.message)
        logger.error(err.message)
        res.status(500).json({ code: 500, message: 'server error', data: null })
    } else {
        console.log('unknown error: ', err.message)
        console.log(err.message)
        logger.error(err.message)
        res.status(500).json({ code: 500, message: 'unknown error', data: null })
    }
}
