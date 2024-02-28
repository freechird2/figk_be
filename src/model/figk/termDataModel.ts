import { LoginHeaderModel } from 'model/login/login'

export interface TermsDataModel extends LoginHeaderModel {
    content: string
    termType: 1 | 2 | 3 | 4
}
