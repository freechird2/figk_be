import { Request, Response, Router } from 'express'
import { authorLoginChecker } from 'middleware/authorLoginChecker'
import { BadRequestError } from 'model/common/error'
import { CommonFigkParamModel } from 'model/figk/common'
import { getNoticeList } from 'sql/figk/notice'
import { checkValidDate } from 'validate/common/dateValidate'
import { noticeParamValidator } from 'validate/FigkAdmin/noticeParam'

const noticeRouter = Router()

// [FS015] 공지사항 list/상세
noticeRouter.get('/', authorLoginChecker, async (req: Request, res: Response) => {
    const param: Partial<CommonFigkParamModel> = { ...req.query }
    try {
        if (param.startDate && param.endDate) {
            const dateValid = await checkValidDate({ startDate: param.startDate, endDate: param.endDate })
            if (!dateValid.start || !dateValid.end) {
                throw new BadRequestError('유효하지 않은 날짜입니다.')
            }
            const sDate = new Date(param.startDate)
            const eDate = new Date(param.endDate)

            if (sDate > eDate) throw new BadRequestError('검색 시작날짜는 검색 종료날짜보다 작아야해요.')
        }

        await noticeParamValidator.validateAsync(param)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    const list = await getNoticeList(param)

    return res.json({ code: 200, message: '공지사항 리스트를 불러왔어요.', data: list })
})
export default noticeRouter
