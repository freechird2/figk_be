import { Request, Response, Router } from 'express'
import joi from 'joi'
import { authorLoginChecker } from 'middleware/authorLoginChecker'
import { BadRequestError, ServerError } from 'model/common/error'
import { CommonFigkParamModel } from 'model/figk/common'
import { getNoticeList } from 'sql/figk/notice'
import { getAuthorDetail } from '../../sql/figk/author'

// Model
const homeRouter = Router()

// [FS006] Figk Studio Home 정보
homeRouter.get('/', authorLoginChecker, async (req: Request, res: Response) => {
    const param: Partial<CommonFigkParamModel> = {
        ...req.query,
        isAuthor: true,
    }

    try {
        await joi.number().min(1).required().validateAsync(param.userId)
    } catch (err) {
        throw new BadRequestError('작가 정보를 확인해주세요.')
    }

    const authorInfo = await getAuthorDetail(param)
    const notice = await getNoticeList({ page: 1, per: 1 })
    // const textFigkList = await getTextFigkList({ authorId: Number(param.userId), isAuthor: true, page: 1, per: 3 })

    try {
        const returnData = {
            notice: notice.list[0],
            authorId: authorInfo.id,
            nickname: authorInfo.nickname,
            groupName: authorInfo.groupName,
            introduction: authorInfo.introduction,
            // textFigk: textFigkList.list,
        }

        res.json({ code: 200, message: '작가 home을 불러왔어요.', data: returnData })
    } catch (error) {
        throw new ServerError(error.message)
    }
})

export default homeRouter
