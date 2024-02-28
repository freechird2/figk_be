import { Router } from 'express'
import artFigkRouter from './artFigk'
import authorRouter from './author'
import homeRouter from './home'
import figkSearchRouter from './searchFigk'
import textFigkRouter from './textFigk'
// import trendFigkRouter from './trendFigk'

const figkRouter = Router()

figkRouter.use('/home', homeRouter)
figkRouter.use('/text-figk', textFigkRouter)
figkRouter.use('/art-figk', artFigkRouter)
// figkRouter.use('/trend-figk', trendFigkRouter)  // [23.04.24 njw] trend figk 삭제
figkRouter.use('/search', figkSearchRouter)
figkRouter.use('/author', authorRouter)

export default figkRouter
