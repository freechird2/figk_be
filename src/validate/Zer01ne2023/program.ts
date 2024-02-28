import joi from 'joi'

export const zeroone2023ProgramValidate = joi.object().keys({
    id: joi
        .number()
        .integer()
        .alter({
            update: (scheme) => scheme.required(),
        })
        .error(new Error('id 를 확인해주세요.')),
    title: joi.string().required().error(new Error('제목을 확인해주세요.')),
    titleEn: joi.string().error(new Error('영문 제목을 확인해주세요.')),
    theme: joi.string().error(new Error('테마를 확인해주세요.')),
    location: joi.string().error(new Error('위치를 확인해주세요.')),
    startTime: joi.string().required().error(new Error('시작시간을 확인해주세요.')),
    endTime: joi.string().required().error(new Error('종료시간을 확인해주세요.')),
    category: joi.string().error(new Error('카테고리를 확인해주세요.')),
    desc: joi.string().required().error(new Error('설명을 확인해주세요.')),
    descEn: joi.string().required().error(new Error('영문 설명을 확인해주세요.')),
    youtube: joi.string().error(new Error('유튜브 링크를 확인해주세요.')),
    profileImg: joi
        .array()
        .items(joi.number().integer())
        .alter({ create: (scheme) => scheme.min(1) })
        .error(new Error('프로필 사진을 확인해주세요.')),
    creatorArr: joi.array().error(new Error('크리에이터 정보를 확인해주세요.')),
    deleteCreator: joi
        .string()
        .regex(/^\d+(,\d+)*$/) // 숫자, 숫자 ... 정규식
        .optional()
        .error(new Error('삭제할 크리에이터를 확인해주세요,')),
    profileFileId: joi.number().integer().min(1).error(new Error('프로필 사진을 확인해주세요,')),
    userId: joi.number().required().error(new Error('로그인 정보를 확인해주세요.')),
})

// 필수값 기획 확인 후 수정 필요

export const zeroone2023ProgramParamValidate = joi
    .object()
    .keys({
        id: joi.number().integer().min(1).error(new Error('Program Id를 확인해주세요.')),
        page: joi.number().integer().min(1).error(new Error('page를 확인해주세요.')),
        per: joi.number().integer().min(1).error(new Error('per를 확인해주세요.')),
    })
    .unknown()
