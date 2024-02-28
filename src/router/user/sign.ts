import { Request, Response, Router } from 'express'
import { createCrytoPassword } from 'function/shared'
import joi from 'joi'
import { BadRequestError, ConflictError, ServerError } from 'model/common/error'
import { RequestAdminJoinModel } from 'model/user/user'
import { checkAdminEmail, insertAdmin } from 'sql/admin/user'
import { RequestAdminJoinValidate } from 'validate/user/user'

const env = require('dotenv')

env.config()

const joinRouter = Router()

// 관리자 회원가입
joinRouter.post('/', async (req: Request, res: Response) => {
    let requestData: RequestAdminJoinModel = { ...req.body, type: 1 } // 일반 관리자는 type 1로 고정

    try {
        await RequestAdminJoinValidate.validateAsync(requestData)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    const emailValid = await checkAdminEmail(requestData.email)

    if (emailValid === -1) {
        throw new ServerError('이메일 중복체크 중 오류가 발생했어요.')
    } else if (emailValid > 0) {
        throw new ConflictError('이미 등록된 이메일이에요.')
    }

    requestData.password = createCrytoPassword(requestData.password)

    const result: boolean = await insertAdmin(requestData)

    if (result) {
        res.json({ code: 200, message: '회원가입이 완료되었어요.', data: null })
    } else {
        throw new ServerError('회원가입 중 오류가 발생했어요.')
    }
})

// 관리자 이메일 중복체크
joinRouter.get('/check-email', async (req: Request, res: Response) => {
    const email: string = req.query.email as string

    try {
        await joi.string().email().required().error(new Error('올바른 이메일을 입력해주세요.')).validateAsync(email)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    const emailValid = await checkAdminEmail(email)

    if (emailValid === -1) {
        throw new ServerError('이메일 중복체크 중 오류가 발생했어요.')
    } else if (emailValid > 0) {
        throw new ConflictError('이미 등록된 이메일이에요.')
    } else {
        res.json({ code: 200, message: '사용 가능한 이메일이에요.', data: null })
    }
})

export default joinRouter
