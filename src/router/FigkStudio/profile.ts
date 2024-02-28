import { Request, Response, Router } from 'express'
import { createCrytoPassword } from 'function/shared'
import joi from 'joi'
import { authorLoginChecker } from 'middleware/authorLoginChecker'
import { fileUploader, uploadWrapper } from 'middleware/multerUploader'
import { BadRequestError, ConflictError, ServerError } from 'model/common/error'
import { AuthorProfileModel } from 'model/figk/authorProfile'
import { CommonFigkParamModel } from 'model/figk/common'
import { RequestAuthorAccountInfoModel } from 'model/user/user'
import {
    checkAuthorNickname,
    checkAuthorPhone,
    getAuthorDetail,
    updateAccountInfo,
    updateAuthorPassword,
    updateAuthorProfile,
} from 'sql/figk/author'
import { AuthorAccountValidator } from 'validate/FigkStudio/authorAccount'
import { RequestAuthorProfileValidate } from 'validate/FigkStudio/authorProfile'

// Model
const profileRouter = Router()

const multipleMulter = fileUploader.fields([
    { name: 'idCard', maxCount: 1 },
    { name: 'bankbook', maxCount: 1 },
])

// [FS007]
// 작가 프로필 정보 return
profileRouter.get('/', authorLoginChecker, async (req: Request, res: Response) => {
    const param: Partial<CommonFigkParamModel> = { ...req.query }

    try {
        await joi.number().min(1).required().validateAsync(param.userId)
    } catch (err) {
        throw new BadRequestError('작가 정보를 확인해주세요.')
    }

    const profile: AuthorProfileModel = await getAuthorDetail(param)

    if (profile) {
        delete profile.status
        delete profile.isVoting
        delete profile.textFigkWeek
    }

    res.json({ code: 200, message: '작가 프로필을 불러왔어요.', data: profile })
})

// [FS008]
// 작가 프로필 정보 update
profileRouter.put('/', authorLoginChecker, async (req: Request, res: Response) => {
    let profile: AuthorProfileModel = { ...req.body, id: req.body.userId }

    try {
        await RequestAuthorProfileValidate.tailor('profile').validateAsync(profile)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    if (!(await checkAuthorPhone(profile))) throw new ConflictError('이미 사용중인 휴대폰번호입니다.')
    if (profile.nickname && !(await checkAuthorNickname(profile))) throw new ConflictError('이미 사용중인 닉네임입니다.')

    const result = await updateAuthorProfile(profile)

    if (result) return res.json({ code: 200, message: '작가 프로필이 수정되었어요.', data: null })
    else throw new ServerError('작가 프로필 수정 중 오류가 발생했어요.')
})

// [FS009]
// 작가 개인정보 수정
profileRouter.put('/password', authorLoginChecker, async (req: Request, res: Response) => {
    let profile: Pick<AuthorProfileModel, 'id' | 'password' | 'newPassword'> = {
        ...req.body,
        id: req.body.userId,
    }

    try {
        await RequestAuthorProfileValidate.tailor('password').validateAsync(profile)
    } catch (err) {
        throw new BadRequestError(err.message)
    }

    profile.password = createCrytoPassword(profile.password)
    profile.newPassword = createCrytoPassword(profile.newPassword)

    const result = await updateAuthorPassword(profile)

    if (result) return res.json({ code: 200, message: '비밀번호가 수정되었어요.', data: null })
    else throw new ServerError('비밀번호 수정 중 오류가 발생했어요.')
})

// 계좌 정보 입력
profileRouter.put(
    '/account',
    uploadWrapper.multipleFileUploader(multipleMulter),
    authorLoginChecker,
    async (req: Request, res: Response) => {
        const data: RequestAuthorAccountInfoModel = {
            ...req.body,
            idCard: req.body.files?.idCard ? req.body.files.idCard[0] : undefined,
            bankbook: req.body.files?.bankbook ? req.body.files.bankbook[0] : undefined,
        }

        try {
            await AuthorAccountValidator.validateAsync(data)
        } catch (err) {
            throw new BadRequestError(err.message)
        }

        await updateAccountInfo(data)
        return res.json({ code: 200, message: '계좌 등록이 완료되었습니다.', data: null })
    }
)

// 계좌 유효성 검사

export default profileRouter
