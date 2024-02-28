import joi from 'joi'

export const zeroone2023ProjectValidate = joi
    .object()
    .keys({
        id: joi
            .number()
            .integer()
            .min(1)
            .alter({
                update: (scheme) => scheme.required(),
            })
            .error(new Error('Project Id를 확인해주세요.')),
        img: joi
            .array()
            .items(joi.number())
            .max(5)
            .alter({
                insert: (scheme) => scheme.required().min(1),
            })
            .error(new Error('Image를 등록해주세요.')),
        title: joi.string().required().error(new Error('제목을 입력해주세요.')),
        titleEn: joi.string().error(new Error('영문 제목을 확인해주세요.')),
        theme: joi.string().error(new Error('theme를 확인해주세요.')),
        location: joi.string().error(new Error('location을 확인해주세요.')),
        headline: joi.string().error(new Error('headline을 확인해주세요.')),
        headlineEn: joi.string().error(new Error('영문 headline을 확인해주세요.')),
        mainIntro: joi.string().required().error(new Error('main intro를 확인해주세요.')),
        mainIntroEn: joi.string().required().error(new Error('영문 main intro를 확인해주세요.')),
        name: joi.string().required().error(new Error('name을 확인해주세요.')),
        nameEn: joi.string().error(new Error('영문 name을 확인해주세요.')),
        nameType: joi.string().error(new Error('name type을 확인해주세요.')),
        koAudio: joi.string().error(new Error('Audio를 확인해주세요.')),
        enAudio: joi.string().error(new Error('영문 Audio를 확인해주세요.')),
        youtube: joi.string().error(new Error('youtube 주소를 확인해주세요.')),
        instagram: joi.string().error(new Error('instagram 주소를 확인해주세요.')),
        member: joi
            .string()
            .alter({
                insert: (s) => s.required().min(1),
            })
            .error(new Error('아티스트를 입력해주세요.')),
        deleteMember: joi.string().error(new Error('삭제할 아티스트를 확인해주세요.')),
        deleteImg: joi.string().error(new Error('삭제할 이미지를 확인해주세요.')),
        userId: joi.number().required().error(new Error('로그인 정보가 없습니다.')),
    })
    .unknown()

export const zeroone2023ProjectMemberValidate = joi
    .object()
    .keys({
        id: joi.number().integer().min(1).error(new Error('member Id를 확인해주세요.')),
        member: joi.string().required().error(new Error('아티스트 명을 입력해주세요.')),
        memberEn: joi.string().error(new Error('영문 아티스트 명을 확인해주세요.')),
        profile: joi.string().error(new Error('profile 주소를 확인해주세요.')),
        homepage: joi.string().error(new Error('homepage 주소를 확인해주세요.')),
    })
    .unknown()

export const zeroone2023ProjectParamValidate = joi
    .object()
    .keys({
        id: joi.number().integer().min(1).error(new Error('Project Id를 확인해주세요.')),
        page: joi.number().integer().min(1).error(new Error('page를 확인해주세요.')),
        per: joi.number().integer().min(1).error(new Error('per를 확인해주세요.')),
    })
    .unknown()
