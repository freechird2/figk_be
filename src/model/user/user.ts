import { CommonJoinModel } from 'model/common/common'

export interface RequestAdminJoinModel extends CommonJoinModel {}

export interface RequestAuthorJoinModel extends CommonJoinModel {
    phone: string
    bankcode: number
    accountType: number
    accountNumber: string
    registrationNum: string
    idCard: number
    bankbook: number
    nickname?: string
    introduction?: string
    instagram?: string
    blog?: string
    homepage?: string
    agreeTerms: 'Y' | 'N'
    agreeCopyright: 'Y' | 'N'
    agreePersonalInfo: 'Y' | 'N'
    agreeMarketing: 'Y' | 'N'
}

export interface RequestAuthorAccountInfoModel
    extends Pick<RequestAuthorJoinModel, 'idCard' | 'bankbook' | 'bankcode' | 'accountType' | 'accountNumber' | 'registrationNum'> {
    userId: number
}

export interface userModel {
    type: 0 | 1 | 2 | 3 // 0: 슈퍼 관리자, 1: 관리자, 2: 작가, 3: ?
    id: string
    isConfirmed?: string
    name?: string
    nickname?: string
    email?: string
    status?: 'Y' | 'N' | 'W'
    groupName?: string
    introduction?: string
    isApprove?: 'Y' | 'N' | 'W'
    isForever?: boolean
    processStatus?: 'V' | 'C' | 'A' // V: 투표 진행중, C: 투표 마감, A: 지원(공모) 가능
    isTempPassword?: 'Y' | 'N'
    textFigkWeek?: number
    currentGroup?: string
    isPause?: 'Y' | 'N'
    accountInfo?: 'Y' | 'N'
    access?: string
    refresh?: string
    textWeek?: number
    artWeek?: number
    projectIds?: string
}
