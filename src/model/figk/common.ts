import { LoginHeaderModel } from 'model/login/login'

export interface CommonFigkDataModel {
    id: number
    publisher: number
    publishedAt: string
    isPublished: 'N' | 'Y' | 'W' // N: 미발행, Y: 발행 완료, W: 발행 대기
    register: number
    userType: 1 | 2
    isAdmin: boolean
}

export interface CommonFigkParamModel {
    id: number
    userType: 1 | 2
    userId: number
    word: string
    tag: number
    authorId: number
    isPublished: string
    status: 'P' | 'F' | 'E' | 'C'
    week: number
    page: number
    per: number
    isSearch: boolean
    title: string
    startDate: string
    endDate: string
    groupId: number
    isAdmin: boolean
    isAuthor: boolean
    isContest: boolean
    isActive: string
    isDetail: string
    name: string
    nickname: string
    phone: string
    email: string
    approveStatus: 'Y' | 'N' | 'W' | 'I'
    order: 1 | 2 | 3 | 4
    contentType: 'T' | 'A'
    termType: number
    dateType: 'U' | 'R' | 'A' | 'C' | 'D' | 'P' // U : updatedAt, R : registeredAt, A : appliedAt, C : completedAt, D : deletedAt, P: publishedAt
    action: 'C' | 'R' | 'U' | 'D'
    type: string
    orderType: 'V' | 'A'
    imageUpload: boolean
}

export interface CommonParamLoginHeaderModel extends CommonFigkParamModel, Pick<LoginHeaderModel, 'userId'> {}
