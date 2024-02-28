import { ServerError } from 'model/common/error'
import { PermissionModel } from 'model/permission/permission'
import db from '../../database'

const commonUserWhereQuery = `AND \`is_deleted\` = 'N'`

export const getUserWithId = async (idx: number) => {
    let user = null
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        const [res] = await conn.query(`SELECT 
                                        *,
                                        (SELECT text_week FROM config) AS textWeek,
                                        (SELECT art_week FROM config) AS artWeek,
                                        (SELECT
                                            g.groupName
                                        FROM config AS c
                                            LEFT JOIN (
                                                SELECT
                                                    id AS g_id, name AS groupName
                                                FROM author_group
                                                WHERE is_deleted = 'N'
                                            ) AS g
                                            ON c.current_group_id = g.g_id
                                         ) AS groupName,
                                         (SELECT process_status FROM config) AS processStatus,
                                         apa.projectIds
                                    FROM admin AS a
                                        LEFT JOIN (
                                            SELECT
                                                admin_id AS apa_id, project_id AS projectIds
                                            FROM admin_project_auth 
                                        ) AS apa
                                        ON a.id = apa.apa_id
                                    WHERE id = ${idx} ${commonUserWhereQuery} `)

        user = res && res[0] && res[0].id ? res[0] : null
    } catch (err) {
        throw new ServerError(`Error[sql/common/user/getUserWithId] : ${err}`)
    } finally {
        if (conn) conn.release()
    }

    return user
}

export const getUserNameWithIdx = async (idx: number) => {
    let conn = null
    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        const res = await conn.query(`SELECT id, name FROM admin WHERE id = ${idx} ${commonUserWhereQuery}`)
        return res && res[0] && res[0].id ? res[0] : null // idx -> id
    } catch (err) {
        throw new ServerError(`Error[sql/common/user/getUserNameWithIdx] : ${err}`)
    } finally {
        if (conn) conn.release()
    }
}

// 사용자 권한 체크
export const checkPermission = async (permissionData: PermissionModel) => {
    let conn = null
    let permission = false

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        const res = await conn.query(`SELECT 
                                        GROUP_CONCAT(name) as projects
                                    FROM project
                                    WHERE FIND_IN_SET(id, (
                                        SELECT
                                            project_id
                                        FROM admin_project_auth
                                        WHERE admin_id = ${permissionData.userId}
                                        )
                                    )`)

        if (res && res[0] && res[0][0] && res[0][0].projects) {
            const projectArr = res[0][0].projects.split(',')

            if (projectArr.includes(permissionData.project)) permission = true
        }
    } catch (err) {
        throw new ServerError(`Error[sql/common/user/getUserPermission] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return permission
}
