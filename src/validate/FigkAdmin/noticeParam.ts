import joi from 'joi'

export const noticeParamValidator = joi
    .object()
    .keys({
        id: joi.number().optional().error(new Error('notice ID 를 확인하세요.')),
        word: joi.string().error(new Error('검색어를 확인해주세요')),
        page: joi.number().integer().min(1).error(new Error('page는 1 이상의 숫자만 입력해주세요.')),
        per: joi.number().integer().min(1).error(new Error('per는 1 이상의 숫자만 입력해주세요.')),
        startDate: joi.string().error(new Error('검색 시작날짜를 확인해주세요.')),
        endDate: joi.string().error(new Error('검색 종료날짜를 확인해주세요.')),
    })
    .unknown()
    .messages({
        'object.missing': '검색 조건을 확인해주세요.',
    })
