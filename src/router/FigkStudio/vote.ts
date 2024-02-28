import { Request, Response, Router } from 'express'
import joi from 'joi'
import { authorLoginChecker } from 'middleware/authorLoginChecker'
import { BadRequestError } from 'model/common/error'
import { CommonFigkParamModel } from 'model/figk/common'
import { voteData } from 'model/figk/vote'
import { getVoteTextList, totalTextFigk, voteAdminSummary, voteChecker, voteTextFigk } from 'sql/figk/textFigk'
import { CommonFigkParamValidate } from 'validate/Figk/common'
const voteFigkRouter = Router()

// [FS016]
// FIGK 송고 당/낙선
voteFigkRouter.get('/search', authorLoginChecker, async (req: Request, res: Response) => {
    const param: Partial<CommonFigkParamModel> = { ...req.query, isContest: true }

    try {
        await CommonFigkParamValidate.validateAsync({
            week: param.week,
            page: param.page,
            per: param.per,
            status: param.status,
        })
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    const list = await totalTextFigk(param)

    return res.json({
        code: 200,
        message: `${param.week ? `${param.week}주차 Text Figk 을 불러왔어요.` : `Text Figk 을 불러왔어요.`}`,
        data: list,
    })
})

// [FS017]
// 현재 주차(공모지원)투표 가능 list
voteFigkRouter.get('/', authorLoginChecker, async (req: Request, res: Response) => {
    const param: { userId: number; isAdmin: boolean } = { userId: req.body.userId, isAdmin: false }
    const summary = await voteAdminSummary('V')
    const list = await getVoteTextList(param)

    return res.json({
        code: 200,
        message: `Text Figk 투표 리스트를 불러왔어요.`,
        data: {
            isVoted: list.isVoted,
            summary: { week: summary.week, group: summary.group, status: summary.status, maxVote: summary.maxVote },
            totalCount: list.totalCount,
            list: list.res,
        },
    })
})

// [FS018]
// 선택한 Text Figk에 투표
voteFigkRouter.post('/', authorLoginChecker, async (req: Request, res: Response) => {
    const data: Partial<voteData> = { ...req.body }

    try {
        await joi.array().items(joi.number()).required().validateAsync(data.votedFigk)
    } catch (err) {
        throw new BadRequestError('투표한 Text Figk을 확인하세요.')
    }

    const voteSet = new Set(data.votedFigk)
    if (voteSet.size !== data.votedFigk.length) {
        throw new BadRequestError(`투표 내에 중복된 값이 있습니다.`)
    }

    await voteTextFigk(data)
    return res.json({
        code: 200,
        message: 'Text Figk 투표가 완료되었어요.',
        data: null,
    })
})

// [FS026] 작가 투표 참여여부
voteFigkRouter.get('/voteChecker', authorLoginChecker, async (req: Request, res: Response) => {
    const param: Partial<CommonFigkParamModel> = { ...req.query, isAdmin: false }

    const isVoted = await voteChecker(param)
    return res.json({ code: 200, message: '투표 참여 여부를 불러왔어요.', data: isVoted })
})

export default voteFigkRouter
