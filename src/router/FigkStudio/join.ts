import { Request, Response, Router } from 'express'
import { createCrytoPassword } from 'function/shared'
import Joi from 'joi'
import { fileUploader, uploadWrapper } from 'middleware/multerUploader'
import { BadRequestError, ConflictError, ServerError } from 'model/common/error'
import { AuthorProfileModel } from 'model/figk/authorProfile'
import { RequestAuthorJoinModel } from 'model/user/user'
import {
    checkAuthorEmail,
    checkAuthorNickname,
    checkAuthorPhone,
    getActivatedTerms,
    getInviteAuthorByCode,
    registAuthor,
} from 'sql/figk/author'
import { RequestAuthorDuplicationValidate } from 'validate/FigkStudio/authorDuplication'
import { RequestAuthorJoinValidate } from 'validate/user/user'
const { sanitizer } = require('../../middleware/sanitizer')

// Model
const authorJoinRouter = Router()

//const singleMulter = fileUploader.single('img')
const multipleMulter = fileUploader.fields([
    { name: 'idCard', maxCount: 1 },
    { name: 'bankbook', maxCount: 1 },
])

// [FS005]
// 작가 등록
authorJoinRouter.post('/', uploadWrapper.multipleFileUploader(multipleMulter), async (req: Request, res: Response) => {
    let userData: RequestAuthorJoinModel = {
        ...req.body,
        idCard: req.body.files?.idCard ? req.body.files.idCard[0] : undefined,
        bankbook: req.body.files?.bankbook ? req.body.files.bankbook[0] : undefined,
    }

    try {
        await RequestAuthorJoinValidate.validateAsync(userData)
    } catch (error) {
        throw new BadRequestError(error.message)
    }

    if (!(await checkAuthorEmail({ email: userData.email }))) throw new ConflictError('이미 등록된 email입니다.')

    userData.password = createCrytoPassword(userData.password)
    const result = await registAuthor(userData)

    if (result && result > 0) return res.json({ code: 200, message: '작가 등록이 완료되었어요.', data: null })
    else {
        throw new ServerError('작가 등록 중 오류가 발생했어요.')
    }
})

// [FS003]
// 작가 휴대폰번호 중복체크
authorJoinRouter.get('/phone', async (req: Request, res: Response) => {
    const data: Partial<AuthorProfileModel> = {
        id: req.query.id as unknown as number,
        phone: req.query.phone as unknown as string,
    }

    try {
        await RequestAuthorDuplicationValidate.validateAsync(data)
    } catch (error) {
        throw new BadRequestError(error.message)
    }

    const result = await checkAuthorPhone(data)

    if (result) return res.json({ code: 200, message: '사용 가능한 휴대폰번호입니다.', data: null })
    else throw new ConflictError('이미 등록된 휴대폰번호입니다.')
})

// [FS002]
// 작가 이메일 중복체크
authorJoinRouter.get('/email', async (req: Request, res: Response) => {
    const data: Partial<AuthorProfileModel> = {
        id: req.query.id as unknown as number,
        email: req.query.email as unknown as string,
    }

    try {
        await RequestAuthorDuplicationValidate.validateAsync(data)
    } catch (error) {
        throw new BadRequestError(error.message)
    }

    const result = await checkAuthorEmail(data)

    if (result) return res.json({ code: 200, message: '사용 가능한 이메일입니다.', data: null })
    else throw new ConflictError('이미 가입된 이메일입니다.')
})

// [FS004]
// 작가 닉네임 중복체크
authorJoinRouter.get('/nickname', async (req: Request, res: Response) => {
    const data: Partial<AuthorProfileModel> = {
        id: req.query.id as unknown as number,
        nickname: req.query.nickname as unknown as string,
    }

    try {
        await RequestAuthorDuplicationValidate.validateAsync(data)
    } catch (error) {
        throw new BadRequestError(error.message)
    }

    const result = await checkAuthorNickname(data)

    if (result) return res.json({ code: 200, message: '사용 가능한 닉네임입니다.', data: null })
    else throw new ConflictError('이미 사용중인 닉네임입니다.')
})

// [FS023] 활성화 된 버전의 약관
authorJoinRouter.get('/term', async (req: Request, res: Response) => {
    const list = await getActivatedTerms()

    return res.json({ code: 200, message: '활성화된 약관을 불러왔어요.', data: list })
})

// [FS027]
// 작가 정보 return
authorJoinRouter.get('/', async (req: Request, res: Response) => {
    const code: string = req.query.code as string

    try {
        await Joi.string().required().validateAsync(code)
    } catch (error) {
        throw new BadRequestError('코드를 확인해주세요.')
    }

    const author = await getInviteAuthorByCode(code)

    return res.json({ code: 200, message: '작가 정보를 불러왔어요.', data: author })
})

export default authorJoinRouter
