import { CommonParamLoginHeaderModel } from './common'

export interface AuthorPayParamModel extends CommonParamLoginHeaderModel {
    payStatus: string
    payType: string
    authorName: string
}
