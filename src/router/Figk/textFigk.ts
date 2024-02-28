import { Request, Response, Router } from 'express'
import { filledParam } from 'function/shared'
import { BadRequestError, ConflictError } from 'model/common/error'
import { ArtFigkListModel } from 'model/figk/artFigkModel'
import { CommonFigkParamModel } from 'model/figk/common'
import { TextFigkListModel } from 'model/figk/textFigkModel'
import { getFigkMaxWeek } from 'sql/figk/common'

// Model
import { getIsLastWithWeek, getMoreAuthorsTextFigk, getTextFigkList } from 'sql/figk/textFigk'
import { CommonFigkParamValidate } from 'validate/Figk/common'

const textFigkRouter = Router()

// [FK002]
// Text Figk list / detail api
// 2023-03-15 JSH
textFigkRouter.get('/', async (req: Request, res: Response) => {
    let param: Partial<CommonFigkParamModel> = filledParam({ ...req.query, isPublished: 'Y' })

    try {
        await CommonFigkParamValidate.validateAsync(param)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    if (param.week && param.week === -1) {
        param.week = (await getFigkMaxWeek()).maxTextWeek
    }

    const figkData: {
        total: number
        artFigk: Array<ArtFigkListModel>
        list: Array<TextFigkListModel>
    } = await getTextFigkList(param)

    let data = null

    if (param.id) {
        if (!figkData.list[0]) throw new ConflictError('존재하지 않거나 삭제된 Text Figk이에요.')

        const moreTextfigk = await getMoreAuthorsTextFigk(figkData.list[0].authorId, figkData.list[0].id)

        data = {
            textFigk: figkData.list[0],
            artFigk: figkData.artFigk[0],
            moreFigk: moreTextfigk,
        }
    } else {
        data = {
            isLast: param.week ? await getIsLastWithWeek(param.week) : param.page * param.per >= figkData.total,
            totalCount: figkData.total || 0,
            list: figkData.list,
        }
    }

    res.json({
        code: 200,
        message: 'Text Figk을 불러왔어요.',
        data,
    })
})

export default textFigkRouter
