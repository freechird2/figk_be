import { Request, Response, Router } from 'express'
import { createCrytoPassword } from 'function/shared'
import { createAccessToken, createRefreshToken } from 'lib/jwt'
import { authorLoginChecker } from 'middleware/authorLoginChecker'
import { authorRefreshChecker } from 'middleware/authorRefreshTokenChecker'
import { BadRequestError, ConflictError, ServerError, UnauthorizedError } from 'model/common/error'
import { AuthorFindPasswordModel } from 'model/figk/authorFindPwModel'
import { CommonFigkParamModel } from 'model/figk/common'
import { LoginDataModel, LoginHeaderModel } from 'model/login/login'
import { userModel } from 'model/user/user'
import { authorLogin } from 'sql/figk/auth'
import { getAuthorDetail, sendTempPassword } from 'sql/figk/author'
import { loginLog } from 'sql/log/loginLog'
import { AuthorFindPasswordValidate } from 'validate/FigkStudio/authorFindPassword'
import { LoginDataValidate, LoginHeaderValidate } from 'validate/login/login'

// Model
const authorAuthRouter = Router()

// [FS001]
authorAuthRouter.post('/login', async (req: Request, res: Response) => {
    let loginData: LoginDataModel = req.body

    try {
        await LoginDataValidate.validateAsync(loginData)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    loginData.password = createCrytoPassword(loginData.password)

    let author: Partial<userModel> = await authorLogin(loginData)

    if (!author) {
        throw new UnauthorizedError('아이디, 비밀번호를 확인해주세요.')
    } else if (author.isConfirmed === 'N') {
        throw new ConflictError('회원가입이 완료되지 않은 계정입니다.\n회원가입을 완료해주세요.')
    } else if (author.isApprove !== 'Y') {
        if (author.isApprove === 'W') throw new ConflictError('승인 대기중인 계정입니다. 관리자에게 문의해주세요.')
        else throw new ConflictError('승인이 거절된 계정입니다.')
    } else if (author.status !== 'Y') throw new ConflictError('해당 아이디는 활동이 정지되었습니다.\nfigk@fig.xyz로 문의해주세요.')

    const accessToken = await createAccessToken({ id: author.id, type: 2 })
    const refreshToken = await createRefreshToken({ id: author.id, type: 2 }, loginData.isForever)

    author.type = 2 // 작가 type
    author.access = accessToken
    author.refresh = refreshToken
    loginLog({ userId: Number(author.id), userType: author.type })

    res.json({ code: 200, message: '로그인 성공', data: author })
})

authorAuthRouter.post('/ping', authorLoginChecker, async (req: Request, res: Response) => {
    const loginData: Partial<CommonFigkParamModel> = req.body

    try {
        await LoginHeaderValidate.validateAsync(loginData)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    let author: userModel = await getAuthorDetail(loginData)

    if (!author) {
        throw new ConflictError('존재하지 않는 작가 정보입니다.')
    } else if (author.isApprove !== 'Y') {
        if (author.isApprove === 'W') throw new UnauthorizedError('승인 대기중인 계정입니다. 관리자에게 문의해주세요.')
        else throw new UnauthorizedError('승인이 거절된 계정입니다.')
    } else if (author.status !== 'Y') throw new UnauthorizedError('비활성화 계정입니다. 관리자에게 문의해주세요.')

    author.type = 2

    const accessToken = await createAccessToken(author)
    const refreshToken = await createRefreshToken(author, false)

    const returnData = {
        id: author.id,
        name: author.name,
        nickname: author.nickname,
        email: author.email,
        status: author.status, // 회원 상태
        isApprove: author.isApprove,
        processStatus: author.processStatus,
        textFigkWeek: author.textFigkWeek,
        currentGroup: author.currentGroup,
        isTempPassword: author.isTempPassword,
        type: loginData.userType,
        groupName: author.groupName,
        isPause: author.isPause,
        access: accessToken,
        refresh: refreshToken,
    }

    res.json({ code: 200, message: 'ping success', data: returnData })
})

authorAuthRouter.post('/refresh', authorRefreshChecker, async (req: Request, res: Response) => {
    const loginData: LoginHeaderModel = req.body

    try {
        await LoginHeaderValidate.validateAsync(loginData)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    let author: userModel = await getAuthorDetail({ authorId: loginData.userId })

    if (!author) {
        throw new ConflictError('존재하지 않는 작가 정보입니다.')
    } else if (author.isApprove !== 'Y') {
        if (author.isApprove === 'W') throw new UnauthorizedError('승인 대기중인 계정입니다. 관리자에게 문의해주세요.')
        else throw new UnauthorizedError('승인이 거절된 계정입니다.')
    } else if (author.status !== 'Y') throw new UnauthorizedError('비활성화 계정입니다. 관리자에게 문의해주세요.')

    author.type = 2

    const accessToken = await createAccessToken(author)
    const refreshToken = await createRefreshToken(author, false)

    if (!accessToken || !refreshToken) {
        throw new ServerError('token create fail')
    }

    const returnData = {
        access: accessToken,
        refresh: refreshToken,
    }

    res.json({ code: 200, message: 'refresh success', data: returnData })
})

// [FS022]
authorAuthRouter.post('/find-pw', async (req: Request, res: Response) => {
    const param: AuthorFindPasswordModel = req.body

    try {
        await AuthorFindPasswordValidate.validateAsync(param)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    if (!(await sendTempPassword(param))) throw new ConflictError('존재하지 않는 회원정보에요.')

    res.json({ code: 200, message: '임시 비밀번호를 발송했어요.', data: null })
})

export default authorAuthRouter
