export interface MigrationArtFigkModel {
    id?: number
    week: number
    title?: string
    tags?: Array<string>
    jacketFileId: number
    videoFileId: number
    publisher: number
    publishedAt?: string
    register: number
    registeredAt: string
}
