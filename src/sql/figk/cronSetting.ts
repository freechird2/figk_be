import { ServerError } from 'model/common/error'
import db from '../../database'

export const getIsPause = async () => {
    let conn = null

    try {
        conn = await db.getConnection()
        if (!conn) throw 'db connection error'

        const [isPause] = await conn.query(`SELECT is_pause AS isPause FROM config`)

        return isPause
    } catch (err) {
        throw new ServerError(`Error[src/sql/figk/cronSetting/getIsPause] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getCronSetting = async () => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const [resCron] = await conn.query(`SELECT * FROM cron_setting`)

        return { resCron: resCron[0] }
    } catch (err) {
        throw new ServerError(`Error[src/sql/figk/cronSetting/getCronSetting] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
