import db from 'database'
import { ServerError } from 'model/common/error'
import { LoginDataModel } from 'model/login/login'

export const authorLogin = async (loginData: LoginDataModel) => {
    let conn = null
    let result = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const query = `SELECT 
                            id, name,
                            IF(nickname IS NULL OR nickname = '', name, nickname) AS nickname,
                            email, status, 
                            is_approve AS isApprove,
                            is_temp_password AS isTempPassword,
                            IFNULL(g.groupName, '') AS groupName, 
                            (
                                SELECT
                                    process_status
                                FROM config 
                            ) AS processStatus,
                            (
                                SELECT
                                    text_week
                                FROM config
                            ) AS textFigkWeek,
                            (
                                SELECT
                                    ag.name
                                FROM config AS c
                                    LEFT JOIN author_group AS ag ON c.current_group_id = ag.id
                            ) AS currentGroup,
                            IF(bankcode IS NOT NULL AND account_type IS NOT NULL AND account_number IS NOT NULL, 'Y', 'N') AS accountInfo
                        FROM author AS a
                            LEFT JOIN (
                                SELECT
                                    id AS g_id, name AS groupName
                                FROM author_group
                                WHERE is_deleted = 'N'
                            ) AS g
                            ON a.group_id = g.g_id
                        WHERE is_deleted = 'N'
                        AND email = '${loginData.email}' 
                        AND password = '${loginData.password}'
                    `

        const [res] = await conn.query(query)

        if (res[0]) result = res[0]
    } catch (err) {
        throw new ServerError(`Error[sql/figk/authorLogin] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}
