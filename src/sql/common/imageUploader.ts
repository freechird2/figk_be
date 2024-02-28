import { ConflictError, ServerError } from 'model/common/error'
import db from '../../database'

// 이미지 업로드
export const imageUploader = async () => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError(`db connection error`)
    } catch (err) {
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        throw new ServerError(`Error[src/sql/common/imageUploader] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
