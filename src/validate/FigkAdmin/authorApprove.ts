import joi from 'joi'

export const AuthorApproveParamValidate = joi
    .object()
    .keys({
        authorId: joi.number().required().integer().min(1).error(new Error('작가 id는 1 이상의 숫자만 입력해주세요.')),
        isApprove: joi.string().required().valid('Y', 'N').error(new Error('승인여부 입력값을 확인해주세요.')),
        approver: joi.number().required().integer().min(1).error(new Error('관리자 정보를 확인할 수 없어요.')),
        groupId: joi.number().integer().min(1).error(new Error('그룹 ID를 확인해주세요.')),
    })
    .unknown()
