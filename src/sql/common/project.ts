import { ServerError } from 'model/common/error'
import { ProjectHeaderModel } from 'model/project/project'
import db from '../../database'

export const insertProject = async (data: ProjectHeaderModel) => {
    let result = -1

    const conn = await db.getConnection()

    if (conn == null) throw 'db connection error'

    try {
        await conn.beginTransaction()

        const ins = await conn.query(`INSERT
                                        project
                                    SET
                                        name = '${data.name}',
                                        file_id = ${data.img},
                                        register = ${data.userId}
                                    `)
        if (ins) {
            await conn.commit()
            return 1
        } else {
            return -2
        }
    } catch (err) {
        await conn.rollback()
        throw new ServerError(`Error[sql/common/project/insertProject] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return -6
}

export const getProjectList = async () => {
    const conn = await db.getConnection()
    let list = null

    if (!conn) throw 'db connection error'

    try {
        list = await conn.query(`SELECT 
                                    id, \`name\`, IFNULL(f.file_transed_name, '') AS logo
                                FROM project AS p
                                    LEFT JOIN (
                                        SELECT
                                            id AS f_id, file_transed_name
                                        FROM files
                                    ) AS f
                                    ON p.file_id = f.f_id
                                WHERE is_deleted = 'N'
                                `)
    } catch (err) {
        throw new ServerError(`Error[sql/common/project/getProjectList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return list ? list[0] : null
}
