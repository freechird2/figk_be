import crypto from 'crypto'
import env from 'dotenv'
import { Request, Response, Router } from 'express'
import { createAccessToken, createRefreshToken } from 'lib/jwt'
import { BadRequestError, ServerError, UnauthorizedError } from 'model/common/error'
import { LoginDataModel } from 'model/login/login'
import { userModel } from 'model/user/user'
import { adminLogin } from 'sql/common/login'
import { loginLog } from 'sql/log/loginLog'
import { LoginDataValidate } from 'validate/login/login'

env.config()

const loginRouter = Router()

// [FA001]
loginRouter.post('/', async (req: Request, res: Response) => {
    let loginData: LoginDataModel = req.body

    try {
        await LoginDataValidate.validateAsync(loginData)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    loginData.password = crypto.createHmac('sha256', process.env.CRYPTO_KEY).update(loginData.password).digest('hex')

    let user: userModel = await adminLogin(loginData)

    if (user == null) throw new UnauthorizedError('아이디 또는 비밀번호를 확인해주세요.')
    else if (user.isApprove !== 'Y')
        throw new UnauthorizedError(user.isApprove === 'W' ? '승인대기 중인 계정입니다. 관리자에게 문의주세요.' : '승인이 거절된 계정입니다.')
    else if (!user.projectIds) throw new UnauthorizedError('권한이 부여된 프로젝트가 없어요.')

    const accessToken = await createAccessToken(user)
    const refreshToken = await createRefreshToken(user, loginData.isForever)

    if (!accessToken || !refreshToken) throw new ServerError()

    const returnData = user
        ? {
              ...user,
              isForever: loginData.isForever,
              access: accessToken,
              refresh: refreshToken,
          }
        : null

    loginLog({ userId: Number(user.id), userType: user.type })

    res.json({ code: 200, message: '로그인 성공', data: returnData })
})

export default loginRouter
