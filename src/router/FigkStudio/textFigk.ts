import { Request, Response, Router } from 'express'
import { filledParam } from 'function/shared'
import joi from 'joi'
import { authorLoginChecker } from 'middleware/authorLoginChecker'
import { BadRequestError, ConflictError, ServerError } from 'model/common/error'
import { CommonFigkParamModel } from 'model/figk/common'
// Model
import { TextFigkDataModel } from 'model/figk/textFigkModel'
import { UpdateLogModel } from 'model/figk/updateLogModel'
import {
    applyFigkList,
    applyTextFigk,
    checkFigkRegister,
    createTextFigk,
    deleteTextFigk,
    getTextFigkList,
    maxApplyFigk,
    updateTextFigk,
} from 'sql/figk/textFigk'
import { insertUpdateLog } from 'sql/figk/updateLog'
import { checkValidDate } from 'validate/common/dateValidate'
import { CommonFigkParamValidate } from 'validate/Figk/common'
import { TextFigkDataValidate } from 'validate/Figk/textFigk'

const textFigkRouter = Router()

// [FS011]
// Text Figk List
// 2023-03-28 JSH
textFigkRouter.get('/', authorLoginChecker, async (req: Request, res: Response) => {
    const param: Partial<CommonFigkParamModel> = filledParam({
        ...req.query,
        authorId: req.query.userId,
    })

    try {
        await CommonFigkParamValidate.validateAsync(param)

        if (param.startDate && param.endDate) {
            const dateValid = await checkValidDate({ startDate: param.startDate, endDate: param.endDate })
            if (!dateValid.start || !dateValid.end) {
                throw new BadRequestError('유효하지 않은 날짜입니다.')
            }
            const sDate = new Date(param.startDate)
            const eDate = new Date(param.endDate)
            if (sDate > eDate) throw new BadRequestError('검색 시작날짜는 검색 종료날짜보다 작아야해요.')
        }
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    const figkData = await getTextFigkList({ ...param, isAuthor: true })

    if (param.id) {
        if (!(await checkFigkRegister(param.id, param.authorId))) throw new ConflictError('삭제된 글이거나 다른 작가의 글입니다.')

        return res.json({ code: 200, message: 'Text Figk을 불러왔어요.', data: figkData.list[0] })
    } else {
        return res.json({
            code: 200,
            message: 'Text Figk을 불러왔어요.',
            data: {
                isLast: param.page * param.per >= figkData.total,
                totalCount: figkData.total || 0,
                list: figkData.list,
                isFirst: figkData.isFirst,
            },
        })
    }
})

// [FS012]
// Text Figk Create
// 2023-03-16 JSH
textFigkRouter.post('/', authorLoginChecker, async (req: Request, res: Response) => {
    const data: Omit<TextFigkDataModel, 'id'> = { ...req.body, register: Number(req.body.userId) }

    try {
        await TextFigkDataValidate.validateAsync(data)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    const result: number = await createTextFigk(data)
    // throw new ServerError('Text Figk 등록에 실패했어요.')

    if (result) {
        return res.json({ code: 200, message: 'Text Figk 등록이 완료되었어요.', data: { id: result } })
    } else {
        throw new ServerError('Text Figk 등록에 실패했어요.')
    }
})

// [FS013]
// Text Figk Update
// 2023-03-16 JSH
textFigkRouter.put('/', authorLoginChecker, async (req: Request, res: Response) => {
    const data: TextFigkDataModel = { ...req.body, register: Number(req.body.userId) }
    try {
        await TextFigkDataValidate.tailor('update').validateAsync(data)
    } catch (err) {
        throw new BadRequestError(err.message)
    }
    const result: number = await updateTextFigk(data)
    if (result) {
        const updateData: UpdateLogModel = {
            type: 1,
            targetId: data.id,
            userType: 2,
            updater: data.register,
        }
        await insertUpdateLog(updateData)
        return res.json({ code: 200, message: 'Text Figk이 수정되었어요.', data: { id: result } })
    } else {
        throw new ServerError('Text Figk 수정 중 오류가 발생했어요.')
    }
})

// [FS020]
// Text Figk Delete
// 2023-03-16 JSH
textFigkRouter.delete('/', authorLoginChecker, async (req: Request, res: Response) => {
    const data = { ...req.body }
    try {
        await joi.number().min(1).required().validateAsync(data.id)
    } catch (err) {
        throw new BadRequestError('Text Figk 정보를 확인할 수 없어요.')
    }
    const result: boolean = await deleteTextFigk({ ids: [data.id], userId: data.userId, userType: data.userType })
    if (result) {
        return res.json({ code: 200, message: 'Text Figk이 삭제되었어요.', data: null })
    } else {
        throw new ServerError('Text Figk 삭제 중 오류가 발생했어요.')
    }
})

// [FS021]
// Text Figk 공모 지원하기
// 2023-03-16 JSH
textFigkRouter.put('/apply', authorLoginChecker, async (req: Request, res: Response) => {
    const figkId: number = req.body.id
    const authorId: number = req.body.userId

    try {
        await joi.number().min(1).required().validateAsync(figkId)
    } catch (err) {
        throw new BadRequestError('Text Figk 정보를 확인할 수 없어요.')
    }
    await maxApplyFigk(authorId)

    const result = await applyTextFigk(figkId, authorId)

    if (!result) throw new ConflictError('이미 공모되었거나 존재하지 않는 Text Figk이에요.')

    return res.json({ code: 200, message: '공모 지원하기가 완료되었어요.', data: null })
})

// 다른 작가의 송고 List
textFigkRouter.get('/apply-list', authorLoginChecker, async (req: Request, res: Response) => {
    const data = await applyFigkList()
    return res.json({ code: 200, message: '송고한 글을 불러왔어요.', data })
})

// 최대 공모 개수 확인
textFigkRouter.post('/max-apply', authorLoginChecker, async (req: Request, res: Response) => {
    const result = await maxApplyFigk(req.body.userId)
    return res.json({ code: 200, message: '송고 가능 여부입니다.', data: result })
})

export default textFigkRouter
