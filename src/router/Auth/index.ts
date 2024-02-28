import { Request, Response, Router } from 'express'
import { checkPermission } from 'sql/common/user'

// Model
import { LoginHeaderModel } from 'model/login/login'

import { createAccessToken, createRefreshToken } from 'lib/jwt'
import { loginChecker } from 'middleware/loginChecker'
import { refreshChecker } from 'middleware/refreshTokenChecker'
import { BadRequestError, ServerError, UnauthorizedError } from 'model/common/error'
import { PermissionModel } from 'model/permission/permission'
import { userModel } from 'model/user/user'
import { getUserWithId } from 'sql/common/user'
import { LoginHeaderValidate } from 'validate/login/login'
import { PermissionValidate } from 'validate/permission/permission'

const AuthRouter = Router()

AuthRouter.post('/ping', loginChecker, async (req: Request, res: Response) => {
    const loginData: LoginHeaderModel = {
        ...req.body,
        isForever: false,
    }

    try {
        await LoginHeaderValidate.validateAsync(loginData)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    const admin = (await getUserWithId(loginData.userId)) as userModel | null

    const accessToken = await createAccessToken(admin)
    const refreshToken = await createRefreshToken(admin, false)

    if (!accessToken || !refreshToken) throw new ServerError('Error[router/auth/ping] : token is empty')

    const returnData = admin
        ? {
              type: admin.type,
              name: admin.name,
              id: loginData.userId,
              email: admin.email,
              status: admin.status, // 회원 상태
              textWeek: admin.textWeek,
              artWeek: admin.artWeek,
              groupName: admin.groupName,
              processStatus: admin.processStatus,
              projectIds: admin.projectIds ? admin.projectIds.split(',').map((m) => parseInt(m)) : [],
              access: accessToken,
              refresh: refreshToken,
          }
        : null

    res.json({ code: 200, message: 'ping success', data: returnData })
})

AuthRouter.post('/refreshAuth', refreshChecker, async (req: Request, res: Response) => {
    const loginData: LoginHeaderModel = req.body

    try {
        await LoginHeaderValidate.validateAsync(loginData)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    const admin = (await getUserWithId(loginData.userId)) as userModel | null

    const accessToken = await createAccessToken(admin)
    const refreshToken = await createRefreshToken(admin, loginData.isForever)

    if (!accessToken || !refreshToken) throw new ServerError('token is empty')

    const returnData = {
        access: accessToken,
        refresh: refreshToken,
    }

    res.json({ code: 200, message: 'refresh success', data: returnData })
})

AuthRouter.post('/check-permission', loginChecker, async (req: Request, res: Response) => {
    const permissionData: PermissionModel = req.body as PermissionModel

    try {
        await PermissionValidate.validateAsync(permissionData)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    const permission = await checkPermission(permissionData)

    if (permission) res.json({ code: 200, message: 'Permission check.', data: null })
    else throw new UnauthorizedError('해당 프로젝트에 권한이 없어요.')
})

export default AuthRouter
