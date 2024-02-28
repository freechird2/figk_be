import { Request, Response, Router } from 'express'
import { filledParam } from 'function/shared'
import { BadRequestError, ConflictError } from 'model/common/error'
import { CommonFigkParamModel } from 'model/figk/common'
import { getArtFigkList } from 'sql/figk/artFigk'
import { CommonFigkParamValidate } from 'validate/Figk/common'

const artFigkRouter = Router()

// [FK004]
// artFigk 리스트 가져오기
artFigkRouter.get('/', async (req: Request, res: Response) => {
    const param: Partial<CommonFigkParamModel> = filledParam({ ...req.query, isPublished: 'Y' })
    try {
        await CommonFigkParamValidate.validateAsync(param)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    let data = null

    let figkData = await getArtFigkList(param)

    if (param.id) {
        if (!figkData.list[0]) throw new ConflictError('존재하지 않거나 삭제된 Art Figk이에요.')
        data = { ...figkData.list[0] }
    } else {
        data = {
            isLast: param.page * param.per >= figkData.total,
            totalCount: figkData.total || 0,
            list: figkData.list,
        }
    }

    res.json({ code: 200, message: 'Art Figk을 불러왔어요.', data: data })
})

// FK007
// Art Figk slide 리스트
// artFigkRouter.get('/slide', async (req: Request, res: Response) => {
//     const data = await getArtFigkSlide()
//     data.map((v: { jacketFileId: number }) => (v.jacketFileId = Number(v.jacketFileId)))
//     res.json({
//         code: 200,
//         message: 'Art Figk을 불러왔어요.',
//         data: data,
//     })
// })

export default artFigkRouter
