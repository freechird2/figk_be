export interface LoginHeaderModel {
    userId: number
    userType: 0 | 1 | 2
    isForever: boolean
}

export interface LoginDataModel {
    email: string
    password: string
    isForever: boolean
}

// export interface LoginDataModel {
//     idx: number
//     type: 0 | 1
//     id: string
//     password: string
//     email: string
//     status: 'Y' | 'N' | 'W'
//     is_require_change_pw: 0 | 1
// }
