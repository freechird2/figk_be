import joi from 'joi'

export const LoginHeaderValidate = joi
    .object()
    .keys({
        userId: joi.number().integer().min(1).error(new Error('request failed.')),
        userType: joi.number().integer().valid(0, 1, 2).error(new Error('request failed.')),
        isForever: joi.boolean().error(new Error('request failed.')),
    })
    .and('userId', 'userType')
    .messages({ 'object.and': '확인할 수 없는 token입니다.' })

export const LoginDataValidate = joi
    .object()
    .keys({
        email: joi.string().email().required().error(new Error('올바른 이메일을 입력해주세요.')),
        password: joi.string().required().error(new Error('비밀번호를 입력해주세요.')),
        isForever: joi.boolean().error(new Error('로그인 유지 여부를 확인해주세요.')),
    })
    .and('email', 'password')
    .messages({ 'object.and': '확인할 수 없는 token입니다.' })
