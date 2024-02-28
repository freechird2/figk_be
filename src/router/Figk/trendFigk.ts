// import { Request, Response, Router } from 'express'
// import { filledParam } from 'function/shared'
// import { BadRequestError, ConflictError } from 'model/common/error'
// import { CommonFigkParamModel } from 'model/figk/common'
// import { getTrendFigkList } from 'sql/figk/trendFigk'
// import { CommonFigkParamValidate } from 'validate/Figk/common'
// const trendFigkRouter = Router()

// // [FK003]
// // TrendFigk 리스트 가져오기
// trendFigkRouter.get('/', async (req: Request, res: Response) => {
//     let param: Partial<CommonFigkParamModel> = filledParam({ ...req.query, isPublished: 'Y' })

//     try {
//         await CommonFigkParamValidate.validateAsync(param)
//     } catch (err) {
//         throw new BadRequestError(err.message)
//     }

//     let figkData = await getTrendFigkList(param)

//     let data = null

//     if (param.id) {
//         if (!figkData.list[0]) throw new ConflictError('존재하지 않거나 삭제된 Trend Figk이에요.')

//         data = {
//             ...figkData.list[0],
//         }
//     } else {
//         data = {
//             isLast: param.page * param.per >= figkData.total,
//             totalCount: figkData.total || 0,
//             list: figkData.list,
//         }
//     }

//     res.json({ code: 200, message: 'Trend Figk을 불러왔어요.', data: data })
// })

// export default trendFigkRouter

// [23.04.24 njw] trend figk 삭제
