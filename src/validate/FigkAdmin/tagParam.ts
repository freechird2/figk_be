import joi from 'joi'

export const TagParamValidate = joi
    .object()
    .keys({
        id: joi.number().integer().min(1).error(new Error('id는 1 이상의 숫자만 입력해주세요.')),
        contentType: joi.string().valid('T', 'A').error(new Error('콘텐츠 유형 조건을 확인해주세요.')),
        word: joi.string().error(new Error('검색어는 문자만 입력해주세요.')),
        page: joi.number().integer().min(1).error(new Error('page는 1 이상의 숫자만 입력해주세요.')),
        per: joi.number().integer().min(1).error(new Error('per는 1 이상의 숫자만 입력해주세요.')),
        order: joi.number().valid(1, 2, 3, 4).error(new Error('정렬 조건을 확인해주세요.')),
        startDate: joi.string().error(new Error('검색 시작날짜를 확인해주세요.')),
        endDate: joi.string().error(new Error('검색 종료날짜를 확인해주세요.')),
    })
    .unknown()
    .and('page', 'per')
    .messages({
        'object.and': '검색 조건을 확인해주세요',
        'object.xor': '검색 조건을 확인해주세요',
        'object.missing': '검색 조건을 확인해주세요',
    })
