import joi from 'joi'

export const termParamValidate = joi
    .object()
    .keys({
        id: joi.number().integer().min(1).error(new Error('id는 1 이상의 숫자만 입력해주세요.')),
        page: joi.number().integer().min(1).error(new Error('page는 1 이상의 숫자만 입력해주세요.')),
        per: joi.number().integer().min(1).error(new Error('per는 1 이상의 숫자만 입력해주세요.')),
        termType: joi.number().optional().valid(1, 2, 3, 4).error(new Error('termType을 확인하세요.')),
        isActive: joi.string().optional().valid('Y', 'N').error(new Error('약관 활성 상태를 확인하세요.(Y/N)')),
        startDate: joi.string().error(new Error('검색 시작날짜를 확인해주세요.')),
        endDate: joi.string().error(new Error('검색 종료날짜를 확인해주세요.')),
    })
    .unknown()
