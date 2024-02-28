import { Request, Response, Router } from 'express'
import Joi from 'joi'
import { authorLoginChecker } from 'middleware/authorLoginChecker'
import { BadRequestError } from 'model/common/error'
import { AuthorPayParamModel } from 'model/figk/authorPayParamModel'
import { CommonFigkParamModel } from 'model/figk/common'
import { getPayListStudio, paymentDetailStudio } from 'sql/figk/payment'
import { checkValidDate } from 'validate/common/dateValidate'
import { CommonFigkParamValidate } from 'validate/Figk/common'

const authorPayRouter = Router()

// [FS014]
// 정산관리 list
authorPayRouter.get('/', authorLoginChecker, async (req: Request, res: Response) => {
    const data: Partial<AuthorPayParamModel> = {
        ...req.query,
        authorId: req.body.userId,
        isAdmin: false,
    }

    try {
        if (data.startDate && data.endDate) {
            const dateValid = await checkValidDate({ startDate: data.startDate, endDate: data.endDate })
            if (!dateValid.start || !dateValid.end) {
                throw new BadRequestError('유효하지 않은 날짜입니다.')
            }
            const sDate = new Date(data.startDate)
            const eDate = new Date(data.endDate)
            if (sDate > eDate) throw new BadRequestError('검색 시작날짜는 검색 종료날짜보다 작아야해요.')
        }
        await CommonFigkParamValidate.validateAsync(data)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    let returnData = await getPayListStudio(data)

    return res.json({
        code: 200,
        message: '정산 목록을 불러왔어요.',
        data: returnData,
    })
})

// 정산 detail
authorPayRouter.get('/detail', authorLoginChecker, async (req: Request, res: Response) => {
    let param: Partial<CommonFigkParamModel> = { ...req.query }

    try {
        await Joi.number().min(1).integer().required().error(new Error('ID를 확인해주세요.')).validateAsync(param.id)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    const result = await paymentDetailStudio(param)

    return res.json({
        code: 200,
        message: '정산 상세내역을 불러왔어요.',
        data: { totalCount: result.totalCount, summary: result.summary, list: result.res },
    })
})

export default authorPayRouter
