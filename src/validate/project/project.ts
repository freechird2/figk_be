import joi from 'joi'

export const ProjectHeaderValidate = joi
    .object()
    .keys({
        img: joi.number().integer().required().error(new Error('프로젝트 이미지를 등록해주세요.')),
        name: joi.string().required().error(new Error('프로젝트 이름을 입력해주세요.')),
        userId: joi
            .number()
            .integer()
            .min(1)
            .required()
            .error(new Error('로그인 정보가 없습니다. 다시 로그인해주세요')),
    })
    .unknown()
    .and('userId', 'name')
    .messages({ 'object.and': '입력 값을 확인해주세요.' })
