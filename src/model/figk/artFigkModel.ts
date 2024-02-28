import { CommonFigkDataModel } from './common'

export interface ArtFigkListModel extends CommonFigkDataModel {
    tags: object
    videoFileId: number
    jacketFileId?: number
}

export interface ArtFigkDataModel extends CommonFigkDataModel {
    videoFileId: number
    jacketFileId: number
    title: string
    tags: string
    thumbType: string
    section: string
    userId: number
}

export interface artFigkParams {
    id?: number
    isPublished?: string
    word?: string
    week?: number
    page?: number
    per?: number
}

// [23.04.24 njw] trend figk 삭제로 인한 이름 변경
