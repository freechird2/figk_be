import joi from 'joi'

export const AuthorCreateDataValidate = joi
    .object()
    .keys({
        isEditor: joi.string().valid('Y', 'N').required().error(new Error('편집위원 여부를 확인해주세요.')),
        name: joi.string().required().max(255).error(new Error('작가 이름을 확인해주세요.')),
        nickname: joi.string().max(255).error(new Error('작가 닉네임을 확인해주세요.')),
        email: joi.string().email().required().error(new Error('작가 이메일을 확인해주세요.')),
        bankId: joi.number().integer().min(1).required().error(new Error('은행을 선택해주세요.')),
        accountNumber: joi.string().required().error(new Error('계좌번호를 확인해주세요.')),
        phone: joi
            .string()
            .required()
            .regex(/^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/)
            .error(new Error('휴대폰번호를 확인해주세요.')),
        instagram: joi.string().uri().error(new Error('인스타그램 주소를 확인해주세요.')),
        blog: joi.string().uri().error(new Error('블로그 주소를 확인해주세요.')),
        homepage: joi.string().uri().error(new Error('홈페이지 주소를 확인해주세요.')),
        contactEmail: joi.string().email().error(new Error('contact Email을 확인해주세요.')),
        groupId: joi.number().required().integer().min(1).error(new Error('작가 그룹을 확인해주세요.')),
        approver: joi.number().required().integer().min(1).error(new Error('관리자 정보를 확인해주세요.')),
    })
    .unknown()
