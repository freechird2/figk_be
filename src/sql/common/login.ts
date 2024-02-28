import { sqlFetch } from 'function/shared'
import { ServerError } from 'model/common/error'
import { LoginDataModel } from 'model/login/login'
import db from '../../database'

export const adminLogin = async (loginData: LoginDataModel) => {
    let result = null
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const [res] = await conn.query(
            `SELECT ad.id, \`name\`, \`email\`, \`type\`, \`status\`, is_approve AS isApprove,
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
              FROM admin AS ad
              LEFT JOIN (
                SELECT
                    admin_id AS apa_id, project_id AS projectIds
                FROM admin_project_auth 
            ) AS apa
            ON ad.id = apa.apa_id
              WHERE email = '${loginData.email}' 
              AND password = '${loginData.password}'
              AND is_deleted = 'N'`
        )

        result = res[0] || null
    } catch (err) {
        throw new ServerError(`Error[sql/common/login/adminLogin] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

export const getAdminType = async (adminIdx: number) => {
    // const isValid = await checkValid(campusIdx);
    // if (!isValid) return null;

    const sql = `SELECT 
                    \`type\`
                FROM admin
                WHERE id = ${adminIdx} AND \`status\` = 1
                `
    const res = await sqlFetch(db, sql, '/sql/teacher/getMyTeacherType')
    return res && (res.type === 1 || res.type === 2 || res.type === 3) ? res.type : null
}

export const checkValid = async (campusIdx: number) => {
    const res = await db.query(`${'query 들어감'} AND c.idx = ${'id'}`)
    return res && res[0] && res[0]?.idx ? true : false
}
