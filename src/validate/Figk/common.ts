import joi from 'joi'

export const CommonFigkParamValidate = joi
    .object()
    .keys({
        id: joi.number().integer().min(1).error(new Error('id는 1 이상의 숫자만 입력해주세요.')),
        isPublished: joi.string().valid('Y', 'N', 'W').error(new Error('발행여부는 입력값을 확인해주세요.')),
        status: joi.string().valid('N', 'E', 'C', 'P', 'F', 'T').error(new Error('공모상태 입력값을 확인해주세요.')),
        authorId: joi.number().integer().min(1).error(new Error('작가 id는 1 이상의 숫자만 입력해주세요.')),
        word: joi.string().error(new Error('검색어는 문자만 입력해주세요.')),
        tag: joi.string().error(new Error('태그명은 문자만 입력해주세요')),
        week: joi.number().integer().min(-1).error(new Error('주는 1 이상의 숫자만 입력해주세요.')),
        page: joi.number().integer().min(1).error(new Error('page는 1 이상의 숫자만 입력해주세요.')),
        per: joi.number().integer().min(1).error(new Error('per는 1 이상의 숫자만 입력해주세요.')),
        title: joi.string().error(new Error('제목은 문자만 입력해주세요.')),
        startDate: joi
            .string()
            .alter({ ga: (scheme) => scheme.required() })
            .error(new Error('검색 시작날짜를 확인해주세요.')),
        endDate: joi
            .string()
            .alter({ ga: (scheme) => scheme.required() })
            .error(new Error('검색 종료날짜를 확인해주세요.')),
        groupId: joi.number().integer().min(1).error(new Error('groupId는 1 이상의 숫자만 입력해주세요.')),
        isContest: joi.boolean().error(new Error('공모관리 여부는 true/false로 입력해주세요.')),
        isActive: joi.string().valid('Y', 'N').error(new Error('활성화 상태 입력값을 확인해주세요.')),
        name: joi.string().error(new Error('검색어는 문자만 입력해주세요.')),
        nickname: joi.string().error(new Error('검색어는 문자만 입력해주세요.')),
        phone: joi.string().error(new Error('휴대폰번호를 확인해주세요.')),
        email: joi.string().error(new Error('이메일을 확인해주세요.')),
        payStatus: joi.string().valid('C', 'W', 'R').error(new Error('정산 상태 입력값을 확인해주세요.')),
        payType: joi.string().valid('V', 'A', 'P').error(new Error('정산 유형 입력값을 확인해주세요.')),
        approveStatus: joi.string().valid('Y', 'N', 'W', 'I').error(new Error('승인여부 입력값을 확인해주세요.')),
        dateType: joi.string().valid('R', 'C', 'D', 'A', 'U').error(new Error('기간검색 유형을 확인해주세요.')), // R: registered_at, C: completed_at, D: deleted_at, A: applied_at, U: updated_at
    })
    .unknown()
    .messages({
        'object.and': '검색 조건을 확인해주세요',
        'object.xor': '검색 조건을 확인해주세요',
        'object.missing': '검색 조건을 확인해주세요',
    })
