import { ServerError } from 'model/common/error'
import { RequestAdminJoinModel } from 'model/user/user'
import db from '../../database'

// 관리자 이메일 중복 체크
export const checkAdminEmail = async (email: string) => {
    let result = 0
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const query = `SELECT 
                            COUNT(id) AS cnt
                        FROM admin
                        WHERE email = '${email}'
                        AND is_deleted = 'N'
                        `
        const [res] = await conn.query(query)

        result = res[0].cnt
    } catch (err) {
        throw new ServerError(`Error[sql/admin/user/checkAdminEmail] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

// 관리자 등록
export const insertAdmin = async (data: RequestAdminJoinModel) => {
    let result = false
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const query = `INSERT
                            admin
                        SET
                            name = '${data.name}',
                            password = '${data.password}',
                            email = '${data.email}',
                            type = ${data.type}
                        `
        const [res] = await conn.query(query)

        if (res.insertId) result = true
    } catch (err) {
        throw new ServerError(`Error[sql/admin/user/insertAdmin] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}
