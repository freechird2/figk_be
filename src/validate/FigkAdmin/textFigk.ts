import joi from 'joi'

export const PublishDataValidate = joi
    .object()
    .keys({
        ids: joi.array().items(joi.number()).required().error(new Error('올바른 Figk ID를 입력해주세요.')),
        publishStatus: joi.string().valid('Y', 'W').required().error(new Error('발행 상태 값을 확인해주세요.')),
        publisher: joi.number().min(1).required().error(new Error('발행자 정보가 없습니다. 다시 로그인해주세요.')),
    })
    .unknown()
