import joi from 'joi'

export const AuthorChangeInfoParamValidate = joi
    .object()
    .keys({
        authorId: joi.number().required().integer().min(1).error(new Error('작가 정보를 확인해주세요.')),
        groupId: joi.number().required().integer().min(1).error(new Error('작가 그룹을 확인해주세요.')),
    })
    .unknown()
