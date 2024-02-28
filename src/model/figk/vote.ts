import { LoginHeaderModel } from 'model/login/login'
import { CommonFigkParamModel } from './common'

export interface voteData extends LoginHeaderModel, Pick<CommonFigkParamModel, 'isAdmin'> {
    id: number
    votedFigk: Array<number>
}
