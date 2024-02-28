import { LoginHeaderModel } from 'model/login/login'

export interface ProgramHeaderModel extends LoginHeaderModel, ProgramCreatorModel {
    id?: number
    title: string
    titleEn: string
    theme: string
    location: string
    startTime: string
    endTime: string
    category: string
    desc: string
    descEn: string
    youtube: string
    profileImg: Array<number>
    creatorArr: Array<any>
    files: object
    deleteCreator?: string
}

export interface ProgramCreatorModel {
    creator: string
    creatorEn: string
    profileJob: string
    profileFileId: number
}

export interface ProgramParamModel {
    id?: number
    page?: number
    per?: number
}
