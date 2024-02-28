import joi from 'joi'

export const AuthorFindPasswordValidate = joi
    .object()
    .keys({
        email: joi.string().email().required().error(new Error('이메일을 확인해주세요.')),
        phone: joi
            .string()
            .regex(/^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/)
            .required()
            .error(new Error('휴대폰번호를 확인해주세요.')),
        name: joi.string().required().error(new Error('이름을 확인해주세요.')),
    })
    .unknown()
