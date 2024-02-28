import { LoginHeaderModel } from 'model/login/login'

export interface noticeDataModel extends LoginHeaderModel {
    id: number
    title: string
    content: string
}
