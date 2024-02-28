import { ServerError } from 'model/common/error'
import { FileUploadModel } from 'model/file/file'
import db from '../../database'

export const uploadFile = async (data: FileUploadModel) => {
    const conn = await db.getConnection()
    let list = null

    if (!conn) return -1

    try {
        await conn.beginTransaction()
        list = await conn.query(`
        INSERT
            files
        SET
            image_transed = '${data.fileTransedName}',
            image_origin = '${data.fileOriginName}',
            file_extension = '${data.fileExtension}',
            file_size = '${data.fileSize}'
        `)

        if (list) {
            await conn.commit()
            return 1
        } else {
            return -2
        }
    } catch (err) {
        throw new ServerError(`Error[sql/admin/file/uploadFile]`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getFileData = async (data: string) => {
    const conn = await db.getConnection()
    let list = null
    if (!conn) return -1
    try {
        list = await conn.query(`
                        SELECT
                            id
                        FROM files
                        ORDER BY id 
                        DESC LIMIT 1`)
    } catch (err) {
        throw new ServerError(`Error[sql/admin/file/getFileData]`)
    } finally {
        if (conn) await conn.release()
    }

    return list ? list[0][0] : null
}
