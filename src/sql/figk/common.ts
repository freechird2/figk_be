import { ServerError } from 'model/common/error'
import { CountParamModel } from 'model/figk/countParamModel'
import { getTags } from 'sql/common/tags'
import db from '../../database'
import { getTextFigkList } from './textFigk'

export const getFigkMaxWeek = async () => {
    let result = {
        maxTextWeek: 0,
        maxTrendWeek: 0,
        maxArtWeek: 0,
    }
    let conn = null
    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        const [maxWeek] = await conn.query(`SELECT 
                                        (
                                            SELECT
                                                MAX(week)
                                            FROM figk_text
                                            WHERE is_deleted = 'N'
                                            AND is_published = 'Y'
                                        ) AS maxTextWeek,
                                        MAX(week) AS maxArtWeek
                                    FROM figk_art
                                    WHERE is_deleted = 'N'
                                    AND is_published = 'Y'`)

        if (maxWeek[0]) result = maxWeek[0]
    } catch (err) {
        throw new ServerError(`Error[sql/figk/common/getFigkMaxWeek] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

export const getFigkHomeList = async () => {
    let conn = null

    try {
        const maxWeek = await getFigkMaxWeek()
        conn = await db.getConnection()

        if (!conn) throw `db connection error`

        const videoQuery = `LEFT JOIN (
                            SELECT
                                id AS v_id, 
                                file_transed_name AS videoUrl
                            FROM files
                        ) AS v`

        const jacketQuery = `LEFT JOIN (
                            SELECT
                                id AS j_id, 
                                file_transed_name AS jacketUrl
                            FROM files
                        ) AS j`

        const query = `SELECT 
                            id, week, title,
                            video_file_id, jacket_file_id,
                            v.videoUrl, IFNULL(j.jacketUrl, '') AS jacketUrl,
                            published_at
                        FROM figk_art AS fa
                            ${videoQuery}
                            ON fa.video_file_id = v.v_id
                            ${jacketQuery}
                            ON fa.jacket_file_id = j.j_id
                        WHERE is_deleted = 'N'
                        AND is_published = 'Y'
                        AND week = ${maxWeek.maxArtWeek}
                        GROUP BY fa.id
                        ORDER BY published_at DESC, registered_at DESC
                        LIMIT 1`

        const [artFigk] = await conn.query(query)
        // await getFiles(conn, artFigk, false)
        const textFigkList = await getTextFigkList({ page: 1, per: 15, week: maxWeek.maxTextWeek, isPublished: 'Y' })

        const video = []

        artFigk.map((l) => {
            if (l.id) {
                const temp = []
                if (l.tags && l.tagName) {
                    const tId = l.tags.split(',')
                    const tName = l.tagName.split(',')

                    tId.map((t, i) => {
                        temp.push({ id: t, name: tName[i] })
                    })
                }

                video.push({
                    id: l.id,
                    figkType: l.figkType,
                    week: l.week,
                    title: l.title || '',
                    videoUrl: l.videoUrl,
                    jacketUrl: l.jacketUrl,
                    tag: temp,
                })
            }
        })
        const getTagResult = await getTags(conn, video, 2)
        if (!getTagResult) throw new ServerError('get tag error')

        return { artFigk: video, textFigk: textFigkList.list || [] }
    } catch (err) {
        throw new ServerError(`Error[sql/figk/common/getFigkHomeList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const addViewCount = async (param: CountParamModel) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw `db connection error`

        let table = param.type == 1 ? 'figk_text' : param.type == 2 ? 'figk_art' : 'figk_trend'

        const [res] = await conn.query(
            `UPDATE 
                ${table}
            SET 
                view = view + 1
            WHERE is_deleted = 'N'
            AND is_published = 'Y'
            AND id = ${param.id}
            `
        )
        //         console.log(
        //             `UPDATE
        // ${table}
        // SET
        // view = view + 1
        // WHERE is_deleted = 'N'
        // AND is_published = 'Y'
        // AND id = ${param.id}
        // `,
        //             res
        //         )
        return res.affectedRows
    } catch (err) {
        throw new ServerError(`Error[sql/figk/common/addViewCount] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const addLikeCount = async (param: CountParamModel) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw `db connection error`

        const [res] = await conn.query(
            `UPDATE 
                figk_text
            SET 
                \`like\` = \`like\` + 1
            WHERE is_deleted = 'N' 
            AND is_published = 'Y'
            AND id = ${param.id}
            `
        )

        return res.affectedRows
    } catch (err) {
        throw new ServerError(`Error[sql/figk/common/addLikeCount] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const addSharedCount = async (param: CountParamModel) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw `db connection error`

        let table = param.type == 1 ? 'figk_text' : 'figk_art'

        const [res] = await conn.query(
            `UPDATE 
                ${table}
            SET 
                shared = shared + 1
            WHERE is_deleted = 'N' 
            AND is_published = 'Y'
            AND id = ${param.id}
            `
        )

        return res.affectedRows
    } catch (err) {
        throw new ServerError(`Error[sql/figk/common/addSharedCount] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getBankList = async () => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw `db connection error`

        const query = `SELECT 
                            id, code, name
                        FROM bank
                        ORDER BY \`order\` ASC, name ASC`
        const [res] = await conn.query(query)

        return res
    } catch (err) {
        throw new ServerError(`Error[sql/figk/common/getBankList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
