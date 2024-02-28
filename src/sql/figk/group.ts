import { attachOffsetLimit } from 'function/shared'
import { ConflictError, ServerError } from 'model/common/error'
import { CommonFigkParamModel } from 'model/figk/common'
import db from '../../database'

export const getGroupSearchName = async () => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const [res] = await conn.query(
            `SELECT id, name 
            FROM author_group 
            WHERE is_deleted = 'N'
            ORDER BY name ASC
            `
        )

        return res
    } catch (err) {
        throw new ServerError(`Error[src/sql/figk/group/getGroupSearchName] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getGroupList = async (param: Partial<CommonFigkParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const [total] = await conn.query(
            `SELECT 
                COUNT(id) AS total
            FROM author_group AS ag                
            WHERE is_deleted = 'N'            
            `
        )

        const [res] = await conn.query(
            `SELECT 
                id, name, IFNULL(a.cnt, 0) AS cnt,
                DATE_FORMAT(ag.registered_at, '%y.%m.%d %H:%i') AS registeredAt
            FROM author_group AS ag
                LEFT JOIN (
                    SELECT
                        group_id, COUNT(id) AS cnt
                    FROM author
                    WHERE is_deleted = 'N'
                    GROUP BY group_id
                ) AS a
                ON ag.id = a.group_id
            WHERE is_deleted = 'N'            
            ORDER BY ag.order ASC
            ${param.page && param.per ? attachOffsetLimit(param.page, param.per) : ''}
            `
        )

        return { isLast: param.page * param.per >= total[0].total, totalCount: total[0].total, list: res }
    } catch (err) {
        throw new ServerError(`Error[src/sql/figk/group/getGroupList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const checkGroupName = async (groupName: string) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw 'db connection error'

        const [res] = await conn.query(
            `SELECT 
                COUNT(*) AS cnt
            FROM author_group
            WHERE is_deleted = 'N'
            AND name = '${groupName}'`
        )

        if (res[0].cnt > 0) return false
        else return true
    } catch (err) {
        throw new ServerError(`Error[src/sql/figk/group/checkGroupName] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const createGroup = async (groupName: string) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        await conn.query(
            `INSERT INTO 
                author_group(name, \`order\`)
            VALUES ('${groupName}', (SELECT MAX(ag.order) + 1 AS max FROM author_group AS ag))
            `
        )
    } catch (err) {
        throw new ServerError(`Error[src/sql/figk/group/createGroup] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const updateGroup = async (group: Array<Pick<CommonFigkParamModel, 'id' | 'name'>>) => {
    let conn = null
    let errorFlag: number = 0

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        await conn.beginTransaction()

        for (let g of group) {
            try {
                const [[validRes]] = await conn.query(`SELECT 
                                                        COUNT(*) AS cnt 
                                                    FROM author_group 
                                                    WHERE is_deleted = 'N'
                                                    AND id != ${g.id}
                                                    AND name = '${g.name}'`)

                if (validRes.cnt > 0) throw 1

                const [res] = await conn.query(
                    `UPDATE 
                        author_group
                    SET
                        name = '${g.name}'
                    WHERE is_deleted = 'N'
                    AND id = ${g.id}    
                    `
                )

                if (!res.affectedRows) throw 2
            } catch (error) {
                errorFlag = error
                break
            }
        }

        if (errorFlag === 1) throw new ConflictError('이미 사용중인 그룹명으로 수정할 수 없어요.')
        else if (errorFlag === 2) throw new ConflictError('이미 삭제되었거나 존재하지 않는 그룹이 포함되어 있습니다.')

        await conn.commit()
    } catch (err) {
        await conn.rollback()
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[src/sql/figk/group/updateGroup] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const deleteGroup = async (groupId: number) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        await conn.beginTransaction()

        await conn.query(
            `UPDATE 
                author
            SET
                group_id = NULL
            WHERE group_id = ${groupId}`
        )

        const [res] = await conn.query(
            `UPDATE 
                author_group
            SET
                is_deleted = 'Y'
            WHERE id = ${groupId}`
        )

        if (res.changedRows > 0) {
            await conn.commit()
            return true
        } else {
            await conn.rollback()
            return false
        }
    } catch (err) {
        await conn.rollback()
        throw new ServerError(`Error[src/sql/figk/group/deleteGroup] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
