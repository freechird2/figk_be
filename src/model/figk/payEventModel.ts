export interface PayEventModel {
    payType: string // vote : 'V', apply : 'A', publish : 'P'
    userId: number
    textFigkId: Array<number>
}
