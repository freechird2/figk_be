import { attachOffsetLimit } from 'function/shared'
import { getArtFigkJoin } from 'middleSql/artFigk'
import { BadRequestError, ConflictError, ServerError } from 'model/common/error'
import { ArtFigkDataModel } from 'model/figk/artFigkModel'
import { CommonFigkParamModel } from 'model/figk/common'
import { deleteTagRelation, getTags, insertTagRelation, updateTagRelation } from 'sql/common/tags'
import { crudLog } from 'sql/log/crudLog'
import db from '../../database'
import { getTagsId } from './tag'

// Art Figk 리스트
export const getArtFigkList = async (filter: Partial<CommonFigkParamModel>) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError(`db connection error`)

        if (filter.id) {
            const [isExist] = await conn.query(
                `SELECT id 
            FROM figk_art 
            WHERE id = ${filter.id}
            AND is_deleted = 'N'`
            )
            if (!isExist.length) throw new ConflictError('존재하지 않거나 삭제된 Art Figk 입니다.')
        }

        const commonWhere = `WHERE fa.is_deleted = 'N'
                            ${filter.isPublished ? `AND is_published = '${filter.isPublished}'` : ''}
                            ${
                                filter.id
                                    ? `AND fa.id = ${filter.id}`
                                    : `
                                        ${filter.week ? `AND fa.week = ${filter.week}` : ''}
                                        ${
                                            filter.word
                                                ? `AND (fa.title LIKE '%${filter.word}%'
                                                    OR fa.id IN (SELECT figk_id
                                                                FROM figk_tag_relation
                                                                WHERE tag_id = (SELECT id
                                                                                FROM tags 
                                                                                WHERE name = '${filter.word}')
                                                                                AND type = 2 ))`
                                                : ''
                                        }`
                            }`

        // 검색어에 해당하는 tag를 포함하는 artfigk 데이터 가져오기

        const [total] = await conn.query(
            `SELECT 
                COUNT(result.id) AS totalCount
            FROM (
                SELECT      
                    fa.id
                FROM figk_art AS fa
                    ${getArtFigkJoin}
            ${commonWhere}
            GROUP BY fa.id) AS result`
        )
        const query = `SELECT         
                        fa.id,
                        IFNULL(fa.title, '') AS title,
                        is_published AS isPublished,
                        IFNULL(jacket_file_id, '') AS jacketFileId,
                        IFNULL(jacket_files.file_transed_name, '') AS jacketUrl,
                        video_files.file_transed_name AS videoUrl,
                        ${
                            filter.isAdmin
                                ? ` jacket_files.file_origin_name AS jacketOriginName,
                                    video_files.file_origin_name AS videoOriginName,
                                    view, shared,
                                    DATE_FORMAT(fa.registered_at, '%y.%m.%d %H:%i') AS registeredAt,
                                    IF(fa.updated_at IS NULL, '', DATE_FORMAT(fa.updated_at, '%y.%m.%d %H:%i')) AS updatedAt,
                                    IF(fa.published_at IS NULL, '', DATE_FORMAT(fa.published_at, '%y.%m.%d %H:%i')) AS publishedAt,
                                    IFNULL(pub.name, '') AS publisher,
                                    regi.email AS registerId,
                                    regi.name AS register,`
                                : ``
                        }
                        fa.week

                        FROM figk_art AS fa
                        ${getArtFigkJoin}
                        ${commonWhere}
                        GROUP BY fa.id
                        ${
                            filter.isPublished === 'Y'
                                ? `ORDER BY fa.week DESC, fa.published_at DESC`
                                : `ORDER BY fa.week DESC`
                        }
                        ${attachOffsetLimit(filter.page, filter.per)}`

        let [res] = await conn.query(query)

        // const getFileResult = await getFiles(conn, res, false)
        // if (!getFileResult) throw new ServerError('get file error')
        // Tag
        const getTagResult = await getTags(conn, res, 2)
        if (!getTagResult) throw new ServerError('get tag error')

        return { list: res, total: total[0].totalCount } || null
    } catch (err) {
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        throw new ServerError(`Error[src/sql/figk/artFigk/getArtFigkList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// Art Figk 등록
export const createArtFigk = async (data: Omit<ArtFigkDataModel, 'id'>) => {
    let conn = null
    let tags = ''

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        await conn.beginTransaction()

        if (data.tags) {
            let tagArr = data.tags.split(',')

            if (tagArr.length > 0) {
                tagArr.map((t, i) => {
                    tagArr[i] = t.trim()
                })

                tags = await getTagsId(tagArr)
            }
        }

        const insertQuery = `INSERT INTO figk_art(video_file_id, jacket_file_id, title, tags, register ) 
                            VALUES (${data.videoFileId} ,
                                    ${data.jacketFileId ? `${data.jacketFileId},` : `NULL,`}
                                    ${data.title ? `'${data.title}',` : `NULL,`} 
                                    ${tags ? `'${tags}',` : `NULL,`} 
                                    ${data.register})`

        const [res] = await conn.query(insertQuery)

        if (res.insertId) {
            // await insertFileRelation(conn, res.insertId)
            if (tags) {
                const insertTag = await insertTagRelation(conn, res.insertId, 2)
                if (!insertTag) throw new ServerError('tag relation insert error')
            }
        } else {
            throw new ServerError('tag relation insert error')
        }
        await conn.commit()
        crudLog({ userId: data.register, userType: Number(data.userType), type: 'A', action: 'C' })
    } catch (err) {
        await conn.rollback()
        throw new ServerError(`Error[src/sql/figk/artFigk/createArtFigk] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// Art Figk 수정
export const updateArtFigk = async (data: Partial<ArtFigkDataModel>) => {
    let conn = null
    let tags = ''

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        await conn.beginTransaction()

        if (data.tags) {
            let tagArr = data.tags.split(',')

            if (tagArr.length > 0) {
                tagArr.map((t, i) => {
                    tagArr[i] = t.trim()
                })
                tags = await getTagsId(tagArr)
            }
        }

        const [isExist] = await conn.query(
            `SELECT 
                id 
            FROM figk_art 
            WHERE id = ${data.id} 
            AND is_deleted = 'N'`
        )
        if (isExist.length < 1) throw new BadRequestError('not exist art figk id')

        const [res] = await conn.query(
            `UPDATE 
                figk_art
            SET
                ${data.videoFileId ? `video_file_id = ${data.videoFileId} ,` : ``} 
                ${data.tags ? `tags ='${tags}' ,` : `tags = NULL,`}
                ${data.title ? `title ='${data.title}' ,` : `title = NULL,`}
                ${data.jacketFileId ? `jacket_file_id =${data.jacketFileId}, ` : ``}
                updated_at = NOW(),
                updater_id = ${data.userId}
            WHERE id = ${data.id}`
        )

        if (res.affectedRows) {
            const updateTag = await updateTagRelation(conn, data.id, 2)
            if (!updateTag) throw new ServerError('tag relation update error')
            // const updateFile = await updateFileRelation(conn, data.id)
            // if (!updateFile) throw new ServerError('file relation update error')
        } else throw new ServerError('tag relation update error')

        await conn.commit()
        crudLog({ userId: Number(data.userId), userType: Number(data.userType), type: 'A', action: 'U' })
    } catch (err) {
        await conn.rollback()
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else throw new ServerError(`Error[src/sql/figk/artFigk/updateArtFigk] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// Art Figk 삭제
export const deleteArtFigk = async (data: { ids: Array<number>; userId: number; userType: number }) => {
    let conn = null

    try {
        conn = await db.getConnection()
        if (!conn) throw 'db connection error'

        const [isExist] = await conn.query(
            `SELECT 
                id
            FROM figk_art 
            WHERE is_deleted = 'N'
            AND id IN (${data.ids.join()})`
        )

        if (isExist.length !== data.ids.length) throw new ConflictError('삭제할 수 없는 Art Figk ID 입니다.')

        await conn.beginTransaction()
        await conn.query(
            `UPDATE 
                figk_art
            SET 
                is_deleted = 'Y'
            WHERE id IN (${data.ids.join()})`
        )

        const deleteTag = await deleteTagRelation(conn, data.ids, 2)
        // const deleteFile = await deleteFileRelation(conn, data.ids)
        if (deleteTag) await conn.commit()
        else throw new ServerError('relation delete error')
        crudLog({ userId: data.userId, userType: data.userType, type: 'A', action: 'D' })
    } catch (err) {
        await conn.rollback()
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[src/sql/figk/artFigk/deleteArtFigk] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getAdminArtFigkList = async (filter: Partial<CommonFigkParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const commonWhere = `${filter.startDate ? `AND fa.updated_at  >= '${filter.startDate}'` : ``}
                            ${
                                filter.endDate
                                    ? `AND fa.updated_at < DATE_ADD ('${filter.endDate}', INTERVAL 1 DAY)`
                                    : ``
                            }
                            ${filter.isPublished ? `AND fa.is_published = '${filter.isPublished}'` : ``}
                            ${filter.week ? ` AND fa.week = ${filter.week}` : ``}
                            ${
                                filter.word
                                    ? `AND (fa.title LIKE '%${filter.word}%' OR a.email LIKE '%${filter.word}%')`
                                    : ``
                            }`

        const summaryQuery = `SELECT 
                                COUNT(CASE WHEN is_published = 'N' OR is_published = 'Y' THEN 1 END) AS totalCount,
                                COUNT(CASE WHEN is_published = 'N' THEN 1 END) AS notPublishedCount,
                                COUNT(CASE WHEN is_published = 'Y' THEN 1 END) AS publishedCount
                            FROM figk_art AS fa
                            LEFT JOIN admin AS a ON fa.register = a.id
                            WHERE fa.is_deleted = 'N'
                            ${commonWhere}`

        let [summary] = await conn.query(summaryQuery)

        // 검색 조건의 total count
        const totalQuery = `SELECT 
                                COUNT(fa.id) AS totalCount
                            FROM figk_art AS fa
                                LEFT JOIN admin AS a ON fa.register = a.id
                            WHERE fa.is_deleted = 'N'
                           ${commonWhere}`

        const [total] = await conn.query(totalQuery)

        const query = `SELECT 
                            fa.id,
                            is_published AS isPublished,
                            fa.week, IFNULL(fa.title, '') AS title,
                            a.email,
                            fa.register, 
                            DATE_FORMAT(fa.registered_at, '%y.%m.%d %H:%i') AS registeredAt,
                            IF(fa.updated_at IS NULL, '', DATE_FORMAT(fa.updated_at, '%y.%m.%d %H:%i')) AS updatedAt
                        FROM figk_art AS fa
                        LEFT JOIN admin AS a ON 
                            CASE 
                                WHEN updater_id IS NOT NULL THEN updater_id = a.id
                                WHEN publisher IS NOT NULL AND updater_id IS NULL THEN publisher = a.id
                                ELSE register = a.id
                            END
                        WHERE fa.is_deleted = 'N'
                        ${commonWhere}
                        ORDER BY fa.updated_at DESC
                        ${filter.page && filter.per ? attachOffsetLimit(filter.page, filter.per) : ''}`

        const [res] = await conn.query(query)
        // const getFileResult = await getFiles(conn, res, true)
        // if (!getFileResult) throw new ServerError('get file error')
        return { summary: summary[0], total: total[0].totalCount, res } || null
    } catch (error) {
        throw new ServerError(`Error[sql/figk/textFigk/getAdminArtFigkList] : ${error}`)
    } finally {
        if (conn) await conn.release()
    }
}

//  Art Figk 즉시발행
export const publishArtFigk = async (data: { figkId: number; publisher: number }) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        const [[isExist]] = await conn.query(
            `SELECT 
                id
            FROM figk_art
            WHERE id = ${data.figkId}
            AND is_deleted = 'N'
            AND is_published = 'N'`
        )
        if (!isExist) throw new ConflictError('발행할 수 없는 Art Figk ID 입니다.')

        // 발행일, 발행자 추가
        await conn.query(
            `UPDATE 
                figk_art
            SET 
                week = (SELECT art_week FROM config),
                is_published = 'Y',
                published_at = NOW(),
                publisher = ${data.publisher}
            WHERE id = ${data.figkId}`
        )

        // artFigk 주차 +1
        await conn.query(`UPDATE config SET art_week = art_week + 1`)

        await conn.commit()
    } catch (err) {
        await conn.rollback()
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/ArtFigk/publishArtFigk]`)
    } finally {
        if (conn) await conn.release()
    }
}

// artFigk cron으로 실행되는 함수  -> 예약발행 기획삭제로 인한 주석처리[0703]
// export const artFigkAutoPublish = async () => {
//     let conn = null

//     try {
//         conn = await db.getConnection()

//         if (!conn) throw 'db connection error'

//         // is_published가 W일 경우 발행
//         const query = `UPDATE
//                             figk_art
//                         SET
//                             is_published = 'Y',
//                             published_at = NOW()
//                         WHERE is_deleted = 'N'
//                         AND is_published = 'W'`
//         await conn.query(query)

//         // config artfigk 주차 + 1
//         await conn.query(`UPDATE config SET art_week = art_week + 1`)
//     } catch (err) {
//         if (err instanceof BadRequestError) throw new BadRequestError(err.message)
//         else if (err instanceof ConflictError) throw new ConflictError(err.message)
//         else throw new ServerError(`Error[sql/figk/artFigk/artFigkAutoPublish] : ${err}`)
//     } finally {
//         if (conn) await conn.release()
//     }
// }

// export const getArtFigkSlide = async () => {
//     let conn = null
//     try {
//         conn = await db.getConnection()
//         if (!conn) throw new ServerError(`db connection error`)

//         const [idRes] = await conn.query(
//             `SELECT COUNT(id) AS max FROM figk_art WHERE is_deleted = 'N' AND is_published = 'Y'`
//         )

//         const query = `(
//                         SELECT
//                             fa.id,
//                             IFNULL(fa.title, '') AS title,
//                             is_published AS isPublished,
//                             CASE
//                                 WHEN is_published = 'N' THEN '미발행'
//                                 WHEN is_published = 'Y' THEN '발행 완료'
//                                 WHEN is_published = 'W' THEN '발행 예약'
//                             END AS publishStatus,
//                             IFNULL(jacket_file_id, '') AS jacketFileId,
//                             IFNULL(jacket_files.file_transed_name, '') AS jacketUrl,
//                             video_files.file_transed_name AS videoUrl,
//                             fa.week
//                         FROM figk_art AS fa
//                             ${getArtFigkJoin}
//                         WHERE fa.is_deleted = 'N'
//                         AND fa.is_published = 'Y'
//                         GROUP BY fa.id
//                         ORDER BY fa.id DESC
//                         LIMIT ${idRes[0].max - 2}, 2
//                         )
//                         UNION
//                         (
//                             SELECT
//                                 fa.id,
//                                 IFNULL(fa.title, '') AS title,
//                                 is_published AS isPublished,
//                                 CASE
//                                     WHEN is_published = 'N' THEN '미발행'
//                                     WHEN is_published = 'Y' THEN '발행 완료'
//                                     WHEN is_published = 'W' THEN '발행 예약'
//                                 END AS publishStatus,
//                                 IFNULL(jacket_file_id, '') AS jacketFileId,
//                                 IFNULL(jacket_files.file_transed_name, '') AS jacketUrl,
//                                 video_files.file_transed_name AS videoUrl,
//                                 fa.week
//                         FROM figk_art AS fa
//                             ${getArtFigkJoin}
//                         WHERE fa.is_deleted = 'N'
//                         AND fa.is_published = 'Y'
//                         GROUP BY fa.id
//                         ORDER BY fa.id DESC
//                         LIMIT 3
//                         )`
//         const [res] = await conn.query(query)
//         const getSearchId = res.map((v) => v.id)

//         if (getSearchId.length) {
//             const [tags] = await conn.query(
//                 `SELECT tl.figk_id, t.id, t.name
//                 FROM figk_tag_relation AS tl
//                 LEFT JOIN tags AS t ON t.id = tl.tag_id
//                 WHERE figk_id IN (${getSearchId.join(',')})
//                 AND tl.type = 2
//                 GROUP BY id
//                 `
//             )

//             res.forEach((v) => {
//                 v.tag = []
//                 tags.forEach((e) => {
//                     if (v.id === e.figk_id) {
//                         v.tag.push({ id: e.id, name: e.name })
//                     }
//                 })
//             })
//         }

//         return res
//     } catch (err) {
//         if (err instanceof BadRequestError) throw new BadRequestError(err.message)
//         else if (err instanceof ConflictError) throw new ConflictError(err.message)
//         else throw new ServerError(`Error[sql/figk/ArtFigk/getArtFigkSlide] : ${err}`)
//     } finally {
//         if (conn) await conn.release()
//     }
// }
