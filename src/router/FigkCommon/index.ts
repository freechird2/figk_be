import { Request, Response, Router } from 'express'
import { filledParam } from 'function/shared'
import joi from 'joi'
import { loginChecker } from 'middleware/loginChecker'
import { fileUploader, uploadWrapper } from 'middleware/multerUploader'
import { BadRequestError, ConflictError, ServerError } from 'model/common/error'
import { CommonFigkParamModel } from 'model/figk/common'
import { CountParamModel } from 'model/figk/countParamModel'
import { addLikeCount, addSharedCount, addViewCount, getBankList, getFigkMaxWeek } from 'sql/figk/common'
import { getGroupSearchName } from 'sql/figk/group'
import { getTagsAutoComplete } from 'sql/figk/tag'

const figkCommonRouter = Router()

// [CM001]
// 태그 자동완성
figkCommonRouter.use('/tag', async (req: Request, res: Response) => {
    const param: Partial<CommonFigkParamModel> = filledParam({ ...req.query })

    try {
        await joi.string().min(2).required().validateAsync(param.word)
    } catch (error) {
        throw new BadRequestError('검색어는 2글자 이상 필수로 입력해주세요.')
    }

    const tagList = await getTagsAutoComplete(param)
    const returnData: Array<string> = []

    tagList.map((t) => {
        returnData.push(t.name)
    })

    if (returnData.length) returnData.sort((a, b) => a.length - b.length)

    try {
        res.json({ code: 200, message: 'tag를 불러왔어요.', data: returnData })
    } catch (error) {
        throw new ServerError(error.message)
    }
})

// [CM002]
figkCommonRouter.use('/group', async (req: Request, res: Response) => {
    const list = await getGroupSearchName()
    res.json({ code: 200, message: 'group을 불러왔어요.', data: list })
})

// [CM004]
// 작가 입력 검색 list
// figkCommonRouter.use('/author', loginChecker, async (req: Request, res: Response) => {
//     const param: Partial<CommonFigkParamModel> = filledParam({ ...req.query, page: 1, per: 1 })

//     try {
//         await CommonFigkParamValidate.validateAsync(param)
//     } catch (error) {
//         throw new BadRequestError(error.message)
//     }

//     const list = await getAuthorSearchName(param)
//     return res.json({ code: 200, message: '작가 목록을 불러왔어요.', data: list })
// })

// [CM005]
// 조회수 증가
figkCommonRouter.put('/view', async (req: Request, res: Response) => {
    const param: CountParamModel = { ...req.body }
    try {
        await joi
            .object()
            .keys({
                id: joi.number().required().min(1).error(new Error('Figk 정보를 확인할 수 없어요.')),
                type: joi.number().valid(1, 2).required().error(new Error('Figk Type을 확인해주세요.')),
            })
            .validateAsync(param)
    } catch (error) {
        throw new BadRequestError(error.message)
    }

    const result = await addViewCount(param)

    if (!result) throw new ConflictError('삭제되었거나 발행되지 않은 게시물이에요.')

    return res.json({ code: 200, message: '해당 게시물의 조회수가 올라갔어요.', data: null })
})

// [CM006]
// 좋아요 수 증가
figkCommonRouter.put('/like', async (req: Request, res: Response) => {
    const param: CountParamModel = { ...req.body }

    try {
        await joi
            .object()
            .keys({
                id: joi.number().required().min(1).error(new Error('Text Figk 정보를 확인할 수 없어요.')),
            })
            .validateAsync(param)
    } catch (error) {
        throw new BadRequestError(error.message)
    }

    const result = await addLikeCount(param)

    if (!result) throw new ConflictError('삭제되었거나 발행되지 않은 게시물이에요.')

    return res.json({ code: 200, message: '해당 게시물의 좋아요 수가 올라갔어요.', data: null })
})

// [CM007]
// 공유 수 증가
figkCommonRouter.put('/shared', async (req: Request, res: Response) => {
    const param: CountParamModel = { ...req.body }

    try {
        await joi
            .object()
            .keys({
                id: joi.number().required().min(1).error(new Error('Text Figk 정보를 확인할 수 없어요.')),
                type: joi.number().valid(1, 2).required().error(new Error('Figk Type을 확인해주세요.')),
            })
            .validateAsync(param)
    } catch (error) {
        throw new BadRequestError(error.message)
    }

    const result = await addSharedCount(param)

    if (!result) throw new ConflictError('삭제되었거나 발행되지 않은 게시물이에요.')

    return res.json({ code: 200, message: '해당 게시물의 공유 수가 올라갔어요.', data: null })
})

figkCommonRouter.post(
    '/image-upload',
    loginChecker,
    uploadWrapper.singleFileUploader(fileUploader.single('image')),
    async (req: Request, res: Response) => {
        const data = JSON.parse(JSON.stringify(req.file))
        return res.json({ code: 200, data: data.location })
    }
)

// [CM008]
// 은행 코드 list
figkCommonRouter.get('/bank', async (req: Request, res: Response) => {
    const list = await getBankList()

    return res.json({ code: 200, message: '은행 코드 list를 불러왔습니다.', data: list })
})

// [CM008]
// 은행 코드 list
figkCommonRouter.get('/week', async (req: Request, res: Response) => {
    const week = await getFigkMaxWeek()

    return res.json({ code: 200, message: '최신 주차 list를 불러왔습니다.', data: { week } })
})

export default figkCommonRouter
