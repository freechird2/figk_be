export type MenuHeaderModel = {
    id?: number
    title: string
    status: number
    url?: string
    depth: number
    projectId?: number
    parentId?: number
    children?: Array<MenuHeaderModel>
}
