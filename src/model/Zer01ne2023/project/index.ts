export interface ProjectMemberModel {
    id: number
    member: string
    memberEn: string
    profile: string
    homepage: string
}

export interface ProjectRequestModel {
    id: number
    img: number[]
    title: string
    titleEn: string
    theme: string
    location: string
    headline: string
    headlineEn: string
    mainIntro: string
    mainIntroEn: string
    name: string
    nameEn: string
    nameType: string
    koAudio: string
    enAudio: string
    youtube: string
    instagram: string
    member: string
    memberArr: ProjectMemberModel[]
    deleteMember: string
    deleteImg: string
    userId: number
    files: any
}

export interface ProjectParamModel {
    id?: number
    page?: number
    per?: number
}
