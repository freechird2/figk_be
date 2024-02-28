export interface UpdateLogModel {
    type: 1 | 2 | 3 | 4 // 1: Text Figk, 2: Art Figk, 3: Trend Figk, 4: 정산 내역
    targetId: number
    userType: 1 | 2 // 1: 관리자, 2: 작가
    updater: number
}
