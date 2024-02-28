import { Router } from 'express'
import artFigkRouter from '../FigkAdmin/artFigk'

import authorLoginRouter from './authorAuth'
import homeRouter from './home'
import authorJoinRouter from './join'
import noticeRouter from './notice'
import authorPayRouter from './payment'
import profileRouter from './profile'
import termRouter from './term'
import textFigkRouter from './textFigk'
import voteFigkRouter from './vote'

const figkStudioRouter = Router()

figkStudioRouter.use('/home', homeRouter)
figkStudioRouter.use('/text-figk', textFigkRouter)
figkStudioRouter.use('/vote', voteFigkRouter)
figkStudioRouter.use('/art-figk', artFigkRouter)
figkStudioRouter.use('/auth', authorLoginRouter)
figkStudioRouter.use('/profile', profileRouter)
figkStudioRouter.use('/join', authorJoinRouter)
figkStudioRouter.use('/author-pay', authorPayRouter)
figkStudioRouter.use('/notice', noticeRouter)
figkStudioRouter.use('/term', termRouter)

export default figkStudioRouter
