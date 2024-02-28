import joi from 'joi'

export const RequestAuthorDuplicationValidate = joi
    .object()
    .keys({
        id: joi.number().integer().min(1).error(new Error('잘못된 작가 정보입니다.')),
        nickname: joi.string().error(new Error('닉네임의 내용을 확인해주세요.')),
        email: joi.string().email().error(new Error('이메일을 확인해주세요.')),
        phone: joi
            .string()
            .regex(/^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/)
            .error(new Error('휴대폰번호를 확인해주세요.')),
    })
    .unknown()
    .or('nickname', 'email', 'phone')
    .messages({ 'object.missing': '필수 입력값을 확인해주세요.' })
