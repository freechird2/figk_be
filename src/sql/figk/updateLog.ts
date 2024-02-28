import { ServerError } from 'model/common/error'
import { UpdateLogModel } from 'model/figk/updateLogModel'
import db from '../../database'

export const insertUpdateLog = async (data: UpdateLogModel) => {
    let result = -1
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const query = `
                        INSERT
                            update_log
                        SET
                            type = ${data.type},
                            target_id = ${data.targetId},
                            user_type = ${data.userType},
                            updater = ${data.updater},
                            update_at = NOW()
                    `

        const [res] = await conn.query(query)
        result = res.insertId
    } catch (err) {
        throw new ServerError(`Error[sql/figk/updateLog/insertUpdateLog] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}
