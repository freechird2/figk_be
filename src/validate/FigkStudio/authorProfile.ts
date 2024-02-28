import joi from 'joi'

export const RequestAuthorProfileValidate = joi
    .object()
    .keys({
        id: joi.number().integer().min(1).required().error(new Error('로그인 정보가 없습니다. 다시 로그인해주세요.')),
        password: joi
            .string()
            .alter({
                password: (schema) => schema.required(),
            })
            .error(new Error('기존 비밀번호 형식이 잘못되었어요.')),
        newPassword: joi
            .string()
            .regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/)
            .alter({
                password: (schema) => schema.required(),
            })
            .error(new Error('비밀번호는 대소문자 영문, 숫자, 특수기호 포함 8자 이상 입력해주세요.')),
        nickname: joi.string().error(new Error('닉네임의 내용을 확인해주세요.')),
        instagram: joi.string().error(new Error('인스타그램 계정 내용을 확인해주세요.')),
        homepage: joi.string().error(new Error('홈페이지 주소 내용을 확인해주세요.')),
        blog: joi.string().error(new Error('블로그 주소 내용을 확인해주세요.')),
        contactEmail: joi.string().email().error(new Error('Contact Email 형식을 확인해주세요.')),
        introduction: joi.string().error(new Error('자기소개 내용을 확인해주세요.')),
        name: joi
            .string()
            .alter({
                profile: (schema) => schema.required(),
            })
            .error(new Error('이름을 입력해주세요.')),
        phone: joi
            .string()
            .regex(/^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/)
            .alter({
                profile: (schema) => schema.required(),
            })
            .error(new Error('휴대폰번호를 확인해주세요.')),
    })
    .unknown()
    .and('name', 'phone')
    .messages({ 'object.and': '이름과 휴대폰번호를 필수로 입력해주세요.' })
