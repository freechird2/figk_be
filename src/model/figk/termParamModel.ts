import { CommonFigkParamModel } from './common'

export interface TermParamModel extends CommonFigkParamModel {
    id: number
    type: number
    isActive: 'Y' | 'N'
    page: number
    per: number
    termType: 1 | 2 | 3 | 4
    isAdmin: boolean
    startDate: string
    endDate: string
}
