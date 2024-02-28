import joi from 'joi'

export const noticeDataValidator = joi
    .object()
    .keys({
        id: joi
            .number()
            .alter({ update: (schema) => schema.required() })
            .error(new Error('공지사항 ID를 확인해주세요')),
        title: joi
            .string()
            .alter({ update: (schema) => schema.required() })
            .alter({ create: (schema) => schema.required() })
            .error(new Error('제목을 확인해주세요.')),
        content: joi
            .string()
            .alter({ update: (schema) => schema.required() })
            .alter({ create: (schema) => schema.required() })
            .error(new Error('내용을 확인해주세요.')),
    })
    .unknown()
