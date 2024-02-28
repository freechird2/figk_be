import joi from 'joi'

export const artFigkDataValidate = joi
    .object()
    .keys({
        id: joi
            .number()
            .integer()
            .min(1)
            // artFigkDataValidate.tailor 의 첫 번째 인자가 update 일 때만 id 를 필수 값으로 적용
            .alter({ update: (schema) => schema.required() })
            .error(new Error('Figk ID를 확인해 주세요.')),
        title: joi
            .string()
            .optional()
            .alter({ create: (schema) => schema.required() })
            .error(new Error('제목을 확인해주세요.')),
        tags: joi.string().optional().error(new Error('태그의 내용을 확인해주세요.')),
        jacketFileId: joi
            .number()
            .min(1)
            .alter({ create: (schema) => schema.required() })
            .error(new Error('썸네일 이미지를 확인해주세요.')),
        videoFileId: joi
            .number()
            .min(1)
            .alter({ create: (schema) => schema.required() })
            .error(new Error('영상을 확인해주세요.')),
        publisher: joi.number().error(new Error('로그인 정보를 확인해주세요.')),
        register: joi.number().error(new Error('로그인 정보를 확인해주세요.')),
        thumbType: joi.string().valid('I', 'S').error(new Error('썸네일 설정을 확인해주세요.')), // I : Image Upload , S : Section Select
    })
    .unknown()

// [23.04.24 njw] trend figk 삭제로 인한 이름 변경
