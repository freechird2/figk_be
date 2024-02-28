import { Request, Response, Router } from 'express'
import Joi from 'joi'
import { BadRequestError, ConflictError } from 'model/common/error'
import { AuthorListModel } from 'model/figk/author'
import { getAuthorDetail } from 'sql/figk/author'
// Model

const authorRouter = Router()

// 작가 상세정보
// [FK006]
// 2023-03-15 JSH
authorRouter.get('/:authorId', async (req: Request, res: Response) => {
    const { authorId } = req.params

    try {
        await Joi.number().min(1).required().validateAsync(authorId)
    } catch (err) {
        throw new BadRequestError('작가 정보를 확인해주세요.')
    }

    const author: AuthorListModel = await getAuthorDetail({ authorId: Number(authorId), isDetail: 'Y' })

    if (!author) throw new ConflictError('존재하지 않는 작가 정보입니다.')

    res.json({ code: 200, message: '작가 정보를 불러왔어요.', data: author })
})

export default authorRouter
