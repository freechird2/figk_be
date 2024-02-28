import { Request, Response, Router } from 'express'
import joi from 'joi'
import { authorLoginChecker } from 'middleware/authorLoginChecker'
import { BadRequestError } from 'model/common/error'
import { CommonFigkParamModel } from 'model/figk/common'
import { getAuthorTermDetail, getAuthorTermVersion } from 'sql/figk/term'

const termRouter = Router()

// [FS024]
// 약관 detail
termRouter.get('/', authorLoginChecker, async (req: Request, res: Response) => {
    const param: Partial<CommonFigkParamModel> = { ...req.query }

    try {
        await joi.number().integer().min(1).error(new Error('약관 id 입력값을 확인해주세요.')).validateAsync(param.id)
        await joi
            .number()
            .integer()
            .valid(1, 2, 3, 4)
            .required()
            .error(new Error('약관 유형 입력값을 확인해주세요.'))
            .validateAsync(param.termType)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    const data = await getAuthorTermDetail(param)

    return res.json({ code: 200, message: `약관을 불러왔어요.`, data: data.detail })
})

// [FS025]
// 약관 버전 list
termRouter.get('/version', authorLoginChecker, async (req: Request, res: Response) => {
    const param: Partial<CommonFigkParamModel> = { ...req.query }

    try {
        await joi
            .number()
            .integer()
            .valid(1, 2, 3, 4)
            .required()
            .error(new Error('약관 유형 입력값을 확인해주세요.'))
            .validateAsync(param.termType)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    const data = await getAuthorTermVersion(param)

    return res.json({
        code: 200,
        message: `약관 버전 목록을 불러왔어요.`,
        data: { totalCount: data.length, list: data },
    })
})

export default termRouter
