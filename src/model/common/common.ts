export interface CommonJoinModel {
    type: 0 | 1 | 2 // 회원가입 유형(0: 마스터 , 1: 관리자, 2: 작가)
    name: string // 이름
    password: string // 비밀번호
    email: string // 이메일
}

export interface MailFormModel {
    type: 'changePassword' | 'inactiveAccount' | 'rejectText'
    tempPw?: string
    email?: string
}
