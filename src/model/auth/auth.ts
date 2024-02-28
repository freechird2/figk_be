export interface AdminModel {
    idx: number
    id: string
    password: string
    name?: string
    code: string
    is_active: number
    // 0 슈퍼 관리자 1 INSCAPE 2 ZER01NEDAY
    type: 0 | 1 | 2
}
