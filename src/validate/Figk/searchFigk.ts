import joi from 'joi'

export const searchFigkParamValidate = joi.object().keys({
    word: joi.string().required().error(new Error('검색어를 확인해주세요.')),
    isPublished: joi.string().valid('Y', 'N').error(new Error('발행여부는 Y/N으로만 입력해주세요.')),
    isSearch: joi.boolean().valid(true).required().error(new Error('검색어 설정 오류입니다.')),
    page: joi.number().valid(1).required().error(new Error('페이지 설정 오류입니다.')),
})
