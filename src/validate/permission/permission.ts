import joi from 'joi'

export const PermissionValidate = joi
    .object()
    .keys({
        userId: joi
            .number()
            .integer()
            .min(1)
            .required()
            .error(new Error('사용자 정보가 없습니다. 다시 로그인해주세요.')),
        project: joi.number().integer().min(1).required().error(new Error('프로젝트 정보가 없습니다.')),
    })
    .unknown()
    .and('userId', 'project')
    .messages({ 'object.and': '사용자 정보와 프로젝트 정보를 확인해주세요.' })
