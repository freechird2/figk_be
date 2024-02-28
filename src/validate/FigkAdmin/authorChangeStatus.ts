import joi from 'joi'

export const AuthorChangeStatusParamValidate = joi
    .object()
    .keys({
        authorId: joi.number().required().integer().min(1).error(new Error('작가 정보를 확인해주세요.')),
        status: joi.string().required().valid('Y', 'N').error(new Error('상태 입력값을 확인해주세요.')),
    })
    .unknown()
