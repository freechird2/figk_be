export interface AuthorApproveParamModel {
    authorId: number
    isApprove: 'Y' | 'N'
    approver: number
    groupId: number
    isAdmin: boolean
}
