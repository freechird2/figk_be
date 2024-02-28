import joi from 'joi'

export const AuthorAccountValidator = joi
    .object()
    .keys({
        userId: joi.number().integer().min(1).error(new Error('잘못된 작가 정보입니다.')),
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
    })
    .unknown()
