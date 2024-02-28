export interface MigrationTextFigkModel {
    id?: number
    authorId?: number
    title: string
    subTitle?: string
    content: string
    link?: string
    week: number
    tags?: Array<string>
    totalVote?: number
    isPublished?: string
    publishedAt?: string
    publisher?: number
    order?: number
    registeredAt: string
    updatedAt?: string
    isDeleted: string
    uid: string
    authorUid?: string
    status?: string
}
