import { Request, Response, Router } from 'express'
import { ServerError } from 'model/common/error'
import { getFigkHomeList } from 'sql/figk/common'

// Model

const homeRouter = Router()

// [FK001]
homeRouter.get('/', async (req: Request, res: Response) => {
    try {
        const returnData = await getFigkHomeList()

        return res.json({ code: 200, message: 'Home을 불러왔어요.', data: returnData })
    } catch (error) {
        throw new ServerError(error.message)
    }
})

export default homeRouter
