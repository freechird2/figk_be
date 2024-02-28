import joi from 'joi'

export const TextFigkDataValidate = joi
    .object()
    .keys({
        id: joi
            .number()
            .integer()
            .min(1)
            .alter({
                update: (schema) => schema.required(),
            })
            .error(new Error('Figk ID를 확인해주세요.')),
        title: joi.string().required().error(new Error('제목을 입력해주세요.')),
        subTitle: joi.string().error(new Error('부제목의 내용을 확인해주세요.')),
        content: joi.string().required().error(new Error('내용을 확인해주세요. (400자 이내)')),
        tags: joi.string().error(new Error('태그 내용을 확인해주세요.')),
        register: joi
            .number()
            .integer()
            .min(1)
            .required()
            .alter({
                admin: (schema) => schema.error(new Error('작가 정보를 확인할 수 없습니다.')),
            })
            .error(new Error('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.')),
    })
    .unknown()
    .and('title', 'content', 'register')
    .messages({ 'object.and': '필수 입력 값을 확인해주세요.' })
