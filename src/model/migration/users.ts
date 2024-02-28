export interface MigrationUserModel {
    id?: number
    code?: string
    uid?: string
    name: string
    password?: string
    email: string
    type?: number
    status?: string
    isApprove: string
    approver?: number
    approvedAt?: string
    isDeleted?: string
    registeredAt?: string
    introduction?: string
}
