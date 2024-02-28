import { attachOffsetLimit } from 'function/shared'
import { ServerError } from 'model/common/error'
import { CommonFigkParamModel } from 'model/figk/common'
import db from '../../database'

export const getTagsId = async (data: Array<string>) => {
    let result = ''
    let conn = null

    if (!data || data.length < 1) return result

    try {
        conn = await db.getConnection()
        if (!conn) throw 'db connection error'

        await conn.beginTransaction()

        const idArr = []

        for (let d of data) {
            if (!d) continue

            const res = await conn.query(`SELECT id FROM tags WHERE \`name\` = '${d.replace(/'/g, `''`)}'`)

            if (res[0] && res[0][0] && res[0][0].id) {
                idArr.push(res[0][0].id)
            } else {
                const ins = await conn.query(`INSERT tags 
                                            SET name = '${d.replace(/'/g, `''`)}'`)
                if (ins[0] && ins[0].insertId) idArr.push(ins[0].insertId)
            }
        }

        if (idArr.length > 0) result = idArr.join(',')

        await conn.commit()
    } catch (err) {
        await conn.rollback()
        result = ''
        throw new ServerError(`Error[src/sql/figk/tag/getTagsId] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

export const getTagsAutoComplete = async (param: Partial<CommonFigkParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const [res] = await conn.query(`SELECT 
                                            name
                                        FROM tags
                                        WHERE MATCH(name) AGAINST('${param.word}' IN BOOLEAN MODE)
                                        ORDER BY
											CASE
												WHEN name = '${param.word}' THEN 0
												WHEN name LIKE '${param.word}%' THEN 1
												ELSE 2
											END
										LIMIT 5`)
        return res
    } catch (err) {
        throw new ServerError(`Error[src/sql/figk/tag/getTagsAutoComplete] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getTagList = async (filter: Partial<CommonFigkParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const [totalCount] = await conn.query(`SELECT 
                                                COUNT(id) AS cnt
                                            FROM tags AS t
                                            ${filter.word ? `WHERE t.name LIKE '%${filter.word}%'` : ``}
                                            `)

        let orderQuery = ``

        if (filter.order == 4) orderQuery = ` result.cnt ASC, result.registeredAt DESC`
        else if (filter.order == 3) orderQuery = ` result.cnt DESC, result.registeredAt DESC`
        else if (filter.order == 2) orderQuery = ` result.registeredAt ASC, result.id ASC`
        else orderQuery = ` result.registeredAt DESC, result.id DESC`

        const [res] = await conn.query(`SELECT 
                                            result.*
                                        FROM (
                                            SELECT 
                                                t.id, t.name, COUNT(tr.tag_id) AS cnt, DATE_FORMAT(t.registered_at, '%y.%m.%d %H:%i') AS registeredAt
                                            FROM tags AS t
                                                LEFT JOIN (
                                                    SELECT
                                                        tag_id
                                                    FROM figk_tag_relation
                                                ) AS tr
                                                ON t.id = tr.tag_id
                                            WHERE t.id IS NOT NULL
                                            ${filter.word ? ` AND t.name LIKE '%${filter.word}%'` : ``}
                                            GROUP BY t.id
                                        ) AS result
                                        ORDER BY ${orderQuery}
                                        ${filter.page && filter.per ? attachOffsetLimit(filter.page, filter.per) : ''}`)

        return { isLast: filter.page * filter.per >= totalCount[0].cnt, totalCount: totalCount[0].cnt, list: res }
    } catch (err) {
        throw new ServerError(`Error[src/sql/figk/tag/getTagList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getTagDetail = async (data: Partial<CommonFigkParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const commonSql = `(SELECT  
                                id, title, 'TEXT' AS type, DATE_FORMAT(registered_at, '%y.%m.%d %H:%i') AS registeredAt
                            FROM figk_text
                            WHERE is_deleted = 'N'
                            AND FIND_IN_SET(${data.id}, tags))
                            UNION
                            
                            (SELECT 
                                id, IFNULL(title, 'untitled') AS title, 'ART' AS type, DATE_FORMAT(registered_at, '%y.%m.%d %H:%i') AS registeredAt
                            FROM figk_art
                            WHERE is_deleted = 'N'
                            AND FIND_IN_SET(${data.id}, tags))`

        const commonWhere = `
                            WHERE r.type IS NOT NULL
                            ${
                                data.contentType === 'T'
                                    ? `AND r.type = 'TEXT'`
                                    : data.contentType === 'A'
                                    ? `AND r.type = 'ART'`
                                    : ``
                            }
                            ${data.word ? `AND r.title LIKE '%${data.word}%'` : ``}
                            ${
                                data.startDate
                                    ? `AND r.registeredAt >= DATE_FORMAT('${data.startDate}', '%y.%m.%d')`
                                    : ``
                            }
                            ${
                                data.endDate
                                    ? `AND r.registeredAt < DATE_FORMAT(DATE_ADD('${data.endDate}', INTERVAL 1 DAY), '%y.%m.%d')`
                                    : ``
                            }
                            `

        const [total] = await conn.query(`SELECT 
                                            COUNT(*) AS total
                                        FROM (${commonSql}) AS r
                                        ${commonWhere}
                                        ORDER BY r.registeredAt DESC`)

        const [res] = await conn.query(`SELECT 
                                            r.id, r.title, r.type, r.registeredAt
                                        FROM (${commonSql}) AS r
                                        ${commonWhere}
                                        ORDER BY r.registeredAt DESC
                                        ${data.page && data.per ? attachOffsetLimit(data.page, data.per) : ''}`)

        return { isLast: data.page * data.per >= total[0].total, totalCount: total[0].total, list: res }
    } catch (err) {
        throw new ServerError(`Error[src/sql/figk/tag/getTagDetail] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const deleteTag = async (tagIds: Array<number>) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        await conn.beginTransaction()

        const [relationRes] = await conn.query(`DELETE FROM figk_tag_relation WHERE tag_id IN (${tagIds.join()})`)

        const [res] = await conn.query(`DELETE FROM tags WHERE id IN (${tagIds.join()})`)

        if (Number(res.affectedRows) != tagIds.length) {
            await conn.rollback()
            return false
        } else {
            await conn.commit()
            return true
        }
    } catch (err) {
        await conn.rollback()
        throw new ServerError(`Error[src/sql/figk/tag/deleteTag] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const invalidTag = async (tag: string) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const [[res]] = await conn.query(`SELECT COUNT(id) AS cnt FROM tags WHERE name = '${tag}'`)

        return res.cnt
    } catch (err) {
        throw new ServerError(`Error[src/sql/figk/tag/invalidTag] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
