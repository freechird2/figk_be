import joi from 'joi'

export const authorPayValidator = joi.object().keys({
    ids: joi.array().items(joi.number().integer()).required().error(new Error('ID를 확인해주세요.')),
    adminId: joi.number().min(1).integer().error(new Error('관리자 정보가 없습니다. 로그인을 확인해주세요.')),
})
