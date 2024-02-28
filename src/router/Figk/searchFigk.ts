import { Request, Response, Router } from 'express'
import { filledParam } from 'function/shared'
import { BadRequestError } from 'model/common/error'
import { CommonFigkParamModel } from 'model/figk/common'
import { getArtFigkList } from 'sql/figk/artFigk'
import { getTextFigkList } from 'sql/figk/textFigk'
import { searchFigkParamValidate } from 'validate/Figk/searchFigk'
const figkSearchRouter = Router()

// [FK005]
figkSearchRouter.get('/', async (req: Request, res: Response) => {
    const param: Partial<CommonFigkParamModel> = filledParam({
        ...req.query,
        isSearch: true,
        page: 1,
        isPublished: 'Y',
    })

    try {
        await searchFigkParamValidate.validateAsync(param)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    const searchResult = {
        textFigk: await getTextFigkList({ ...param }),
        // trendFigk: await getTrendFigkList({ ...param, per: 2 }), trendFigk 유튜브 변경으로 인한 삭제
        artFigk: await getArtFigkList({ ...param }),
    }

    return res.json({
        code: 200,
        message: param.word ? `'${param.word}'에 대한 검색 결과입니다.` : 'Figk 검색 결과를 불러왔어요.',
        data: {
            summary: {
                searchWord: param.word,
                textFigkTotal: searchResult.textFigk.total,
                artFigkTotal: searchResult.artFigk.total,
                // trendFigkTotal: searchResult.trendFigk.total,
            },

            textFigk: searchResult.textFigk.list,
            artFigk: searchResult.artFigk.list,
            // trendFigk: searchResult.trendFigk.list,
        },
    })
})

export default figkSearchRouter
