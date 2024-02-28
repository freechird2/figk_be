import joi from 'joi'

export const termsValidate = joi
    .object()
    .keys({
        content: joi.string().required().error(new Error('내용을 확인하세요.')),
        termType: joi.number().required().valid(1, 2, 3, 4).error(new Error('유형을 확인하세요.')),
    })
    .unknown()
