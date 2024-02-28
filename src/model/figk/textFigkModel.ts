import { CommonFigkDataModel } from './common'

export interface TextFigkListModel extends CommonFigkDataModel {
    title: string
    subTitle: string
    content: string
    authorName: string
    view: number
    registeredAt: string
    updatedAt: string
    link: string
    week: number
    authorId: number
    introduction: string
    tags: object
}

export interface TextFigkDataModel extends CommonFigkDataModel {
    title: string
    content: string
    subTitle: string
    link: string
    tags: string
}
