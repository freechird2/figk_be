import joi from 'joi'

export const AuthorInviteParamValidate = joi
    .object()
    .keys({
        email: joi.string().email().required().error(new Error('이메일을 확인해주세요.')),
        register: joi.number().integer().min(1).required().error(new Error('관리자 정보를 확인할 수 없습니다.')),
    })
    .unknown()
