import { Router } from 'express'
import AuthRouter from 'router/Auth'

import joinRouter from 'router/user/sign'
import figkRouter from './Figk'
import figkAdminRouter from './FigkAdmin'
import figkCommonRouter from './FigkCommon'
import figkStudioRouter from './FigkStudio'
import figverseRouter from './Figverse'
import loginRouter from './Login'
import migrationRouter from './Migration'
import zer01ne2023Router from './Zer01ne2023'

const indexRouter = Router()

indexRouter.use('/auth', AuthRouter)
indexRouter.use('/login', loginRouter)
indexRouter.use('/verse', joinRouter)
indexRouter.use('/migration', migrationRouter)
indexRouter.use('/figk', figkRouter)
indexRouter.use('/figk-studio', figkStudioRouter)
indexRouter.use('/figk-admin', figkAdminRouter)
indexRouter.use('/figk-common', figkCommonRouter)
indexRouter.use('/join', joinRouter)
indexRouter.use('/zeroone-2023', zer01ne2023Router)
indexRouter.use('/figverse', figverseRouter)

module.exports = indexRouter
