import joi from 'joi'

export const RequestAdminJoinValidate = joi
    .object()
    .keys({
        email: joi.string().email().required().error(new Error('올바른 이메일을 입력해주세요.')),
        password: joi.string().required().error(new Error('비밀번호를 입력해주세요.')),
        name: joi.string().required().error(new Error('이름을 입력해주세요.')),
        type: joi.number().integer().valid(0, 1, 2).required().error(new Error('관리자 type이 입력되지 않았습니다')),
    })
    .and('email', 'password', 'name', 'type')
    .messages({ 'object.and': '입력 값을 확인해주세요.' })

export const RequestAuthorJoinValidate = joi
    .object()
    .keys({
        email: joi.string().email().required().error(new Error('Email을 확인해주세요.')),
        name: joi.string().required().error(new Error('이름을 확인해주세요.')),
        phone: joi
            .string()
            .required()
            .regex(/^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/)
            .error(new Error('휴대폰번호를 확인해주세요.')),
        password: joi
            .string()
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/)
            .required()
            .error(new Error('비밀번호는 대소문자 영문, 숫자, 특수기호 포함 8자 이상 입력해주세요.')),
        bankcode: joi.number().integer().min(1).required().error(new Error('은행 코드를 확인해주세요.')),
        accountType: joi.number().integer().min(1).max(4).required().error(new Error('계좌 type을 확인해주세요.')),
        accountNumber: joi.string().required().error(new Error('계좌번호를 확인해주세요.')),
        registrationNum: joi
            .string()
            .regex(/^\d{2}([0]\d|[1][0-2])([0][1-9]|[1-2]\d|[3][0-1])[-]*[1-4]\d{6}$/)
            .required()
            .error(new Error('주민등록번호를 확인해주세요.')),
        idCard: joi.number().integer().min(1).required().error(new Error('신분증 사본을 등록해주세요.')),
        bankbook: joi.number().integer().min(1).required().error(new Error('통장 사본을 등록해주세요.')),
        agreeTerms: joi.string().valid('Y').required().error(new Error('서비스 이용 약관 동의 여부를 확인해주세요.')),
        agreeCopyright: joi.string().valid('Y').required().error(new Error('저작권 동의 여부를 확인해주세요.')),
        agreePersonalInfo: joi.string().valid('Y').required().error(new Error('개인정보 활용 동의 여부를 확인해주세요.')),
        agreeMarketing: joi.string().valid('Y', 'N').required().error(new Error('마케팅 정보 수신 동의 여부를 확인해주세요.')),
    })
    .unknown()
