// import { attachOffsetLimit } from 'function/shared'
// import { getTrendFigkJoin } from 'middleSql/trendFigk'
// import { BadRequestError, ConflictError, ServerError } from 'model/common/error'
// // import { ArtTrendFigkDataModel } from 'model/figk/artFigkModel'

// import { CommonFigkParamModel } from 'model/figk/common'
// import db from '../../database'
// import { getTagsId } from './tag'

// // Trend Figk 리스트
// export const getTrendFigkList = async (filter: Partial<CommonFigkParamModel>) => {
//     let conn = null
//     try {
//         conn = await db.getConnection()
//         if (!conn) throw new ServerError('db connection error')

//         const commonWhere = `${filter.isPublished ? `AND is_published = '${filter.isPublished}'` : ''}
//                             ${
//                                 filter.id
//                                     ? `AND ftr.id = ${filter.id}`
//                                     : `
//                                     ${filter.week ? `AND ftr.week = ${filter.week}` : ''}
//                                     ${
//                                         filter.word
//                                             ? `
//                                             AND (
//                                                 ftr.title LIKE '%${filter.word}%'
//                                                 OR FIND_IN_SET((SELECT id FROM tags WHERE name LIKE '${filter.word}'), ftr.tags)
//                                                 )
//                                             `
//                                             : ''
//                                     }
//                                     `
//                             }`

//         const [total] = await conn.query(`SELECT
//                                             COUNT(result.id) AS totalCount
//                                         FROM (
//                                             SELECT
//                                                 ftr.id
//                                             FROM figk_trend AS ftr
//                                             ${getTrendFigkJoin}
//                                         WHERE ftr.is_deleted = 'N'
//                                         ${commonWhere}
//                                         GROUP BY ftr.id
//                                         ) AS result`)

//         let [res] = await conn.query(`SELECT
//                                         ftr.id,
//                                         IFNULL(ftr.title, '') AS title,
//                                         IFNULL(ftr.tags,'') AS tags,
//                                         IFNULL(GROUP_CONCAT(t.name), '') AS tagNames,
//                                         CASE
//                                             WHEN is_published = 'N' THEN '미발행'
//                                             WHEN is_published = 'Y' THEN '발행 완료'
//                                             WHEN is_published = 'W' THEN '발행 예약'
//                                         END AS publishStatus,
//                                         IFNULL(jacket_files.file_transed_name, '') AS jacketFileName
//                                         ${
//                                             filter.isAdmin
//                                                 ? `,
//                                                     DATE_FORMAT(ftr.registered_at, '%y.%m.%d %H:%i') AS registeredAt,
//                                                     DATE_FORMAT(ftr.published_at, '%y.%m.%d %H:%i') AS publishedAt,
//                                                     pub.name AS publisher,
//                                                     regi.name AS register`
//                                                 : ``
//                                         }
//                                         ${
//                                             filter.isSearch
//                                                 ? ``
//                                                 : `
//                                                     ,
//                                                     video_files.file_transed_name AS videoFileName,
//                                                     ftr.week
//                                                 `
//                                         }

//                                     FROM figk_trend AS ftr
//                                         ${getTrendFigkJoin}
//                                     WHERE ftr.is_deleted = 'N'
//                                         ${commonWhere}
//                                     GROUP BY ftr.id
//                                     ${
//                                         filter.isPublished === 'Y'
//                                             ? `ORDER BY ftr.published_at DESC`
//                                             : `ORDER BY ftr.week DESC`
//                                     }
//                                     ${attachOffsetLimit(filter.page, filter.per)}
//                                     `)

//         if (res.length > 0) {
//             res.map((v: any) => {
//                 if (v.tags && v.tagNames) {
//                     const tagId = v.tags.split(',')
//                     const tagName = v.tagNames.split(',')
//                     const tempArr = []
//                     tagId.map((v: string, i: number) => {
//                         if (v && tagName[i]) tempArr.push({ id: Number(v), name: tagName[i] })
//                     })
//                     v.tag = tempArr
//                 } else {
//                     v.tag = []
//                 }
//                 delete v.tags
//                 delete v.tagNames
//             })
//         }
//         return { list: res, total: total[0].totalCount } || null
//     } catch (err) {
//         throw new ServerError(`Error[src/sql/figk/trendFigk/getTrendFigkList] : ${err}`)
//     } finally {
//         if (conn) await conn.release()
//     }
// }

// // Trend Figk 생성
// export const createTrendFigk = async (data: Omit<ArtTrendFigkDataModel, 'id'>, url: string) => {
//     let conn = null
//     let tags = ''

//     try {
//         conn = await db.getConnection()

//         if (!conn) throw 'db connection error'

//         await conn.beginTransaction()

//         if (data.tags) {
//             let tagArr = data.tags.split(',')

//             if (tagArr.length > 0) {
//                 tagArr.map((t, i) => {
//                     tagArr[i] = t.trim()
//                 })

//                 tags = await getTagsId(tagArr)
//             }
//         }

//         const [res] =
//             await conn.query(`INSERT INTO figk_trend(week,video_file_id,  jacket_file_id, title, tags, register )
//                             VALUES ((SELECT trend_week FROM config),
//                                     ${data.videoFileId} ,
//                                     ${data.jacketFileId ? `${data.jacketFileId},` : `NULL,`}
//                                     ${data.title ? `'${data.title}',` : `NULL,`}
//                                     ${tags ? `'${tags}',` : `NULL,`}
//                                     ${data.register}
//                                 )`)

//         if (res.insertId) await conn.commit()
//         else throw new ServerError()
//     } catch (err) {
//         await conn.rollback()
//         if (err instanceof BadRequestError) throw new BadRequestError(err.message)
//         throw new ServerError(`Error[src/sql/figk/trendFigk/createTrendFigk] : ${err}`)
//     } finally {
//         if (conn) await conn.release()
//     }
// }

// // Trend Figk 수정
// export const updateTrendFigk = async (data: Partial<ArtTrendFigkDataModel>) => {
//     let conn = null
//     let tags = ''

//     try {
//         conn = await db.getConnection()

//         if (!conn) throw 'db connection error'

//         await conn.beginTransaction()

//         if (data.tags) {
//             let tagArr = data.tags.split(',')

//             if (tagArr.length > 0) {
//                 tagArr.map((t, i) => {
//                     tagArr[i] = t.trim()
//                 })
//                 tags = await getTagsId(tagArr)
//             }
//         }
//         const [isExist] = await conn.query(`SELECT id FROM figk_trend WHERE id = ${data.id} AND is_deleted = 'N'`)
//         if (isExist.length < 1) throw new BadRequestError('not exist trend figk id')

//         const [res] = await conn.query(`UPDATE
//                                             figk_trend
//                                         SET
//                                             ${data.videoFileId ? `video_file_id = ${data.videoFileId} ,` : ``}
//                                             ${data.tags ? `tags ='${tags}' ,` : `tags = NULL,`}
//                                             ${data.title ? `title ='${data.title}' ,` : `title = NULL,`}
//                                             ${
//                                                 data.jacketFileId
//                                                     ? `jacket_file_id =${data.jacketFileId} ,`
//                                                     : `jacket_file_id = NULL,`
//                                             }
//                                             updated_at = NOW()
//                                         WHERE  id = ${data.id}`)
//         if (res.affectedRows) {
//             await conn.commit()
//         } else {
//             throw new ServerError()
//         }
//     } catch (err) {
//         await conn.rollback()
//         if (err instanceof BadRequestError) throw new BadRequestError(err.message)
//         else throw new ServerError(`Error[src/sql/figk/trendFigk/updateTrendFigk] : ${err}`)
//     } finally {
//         if (conn) await conn.release()
//     }
// }

// // Trend Figk 삭제
// export const deleteTrendFigk = async (figkIds: Array<number>) => {
//     let conn = null

//     try {
//         conn = await db.getConnection()

//         if (!conn) throw 'db connection error'

//         const [res] = await conn.query(`UPDATE
//                                             figk_trend
//                                         SET
//                                             is_deleted = 'Y'
//                                         WHERE id IN (${figkIds.join()})`)

//         if (!res.affectedRows) {
//             throw new BadRequestError('not exist trend figk id')
//         } else if (!res.changedRows) {
//             throw new BadRequestError('already deleted trend figk id')
//         }
//     } catch (err) {
//         if (err instanceof BadRequestError) throw new BadRequestError(err.message)
//         else throw new ServerError(`Error[src/sql/figk/trendFigk/deleteTrendFigk] : ${err}`)
//     } finally {
//         if (conn) await conn.release()
//     }
// }

// export const getAdminTrendFigkList = async (filter: Partial<CommonFigkParamModel>) => {
//     let conn = null

//     try {
//         conn = await db.getConnection()

//         if (!conn) throw 'db connection error'

//         // 상단 summary
//         const summaryQuery = `SELECT
//                                 COUNT(id) AS totalCount,
//                                 SUM(view) AS totalView,
//                                 COUNT(CASE WHEN is_published = 'N' THEN 1 END) AS notPublishedCount,
//                                 COUNT(CASE WHEN is_published = 'Y' THEN 1 END) AS publishedCount,
//                                 COUNT(CASE WHEN is_published = 'W' THEN 1 END) AS waitCount
//                             FROM figk_trend AS ft
//                             WHERE is_deleted = 'N'
//                             ${filter.title ? ` AND ft.title LIKE '%${filter.title}%'` : ``}
//                             ${filter.startDate ? ` AND ft.registered_at >= '${filter.startDate}'` : ``}
//                             ${
//                                 filter.endDate
//                                     ? ` AND ft.registered_at < DATE_ADD('${filter.endDate}', INTERVAL 1 DAY)`
//                                     : ``
//                             }
//                             ${filter.isPublished ? ` AND is_published = '${filter.isPublished}'` : ``}
//                             ${filter.week ? ` AND week = ${filter.week}` : ``}`

//         let [summary] = await conn.query(summaryQuery)

//         if (summary[0]) summary[0].totalView = Number(summary[0].totalView)

//         // 검색 조건의 total count
//         const totalQuery = `SELECT
//                                 COUNT(id) AS totalCount
//                             FROM figk_trend AS ft
//                                 LEFT JOIN (SELECT id AS a_id, name AS registerName FROM admin) AS a ON ft.register = a.a_id
//                             WHERE is_deleted = 'N'
//                             ${filter.title ? ` AND ft.title LIKE '%${filter.title}%'` : ``}
//                             ${filter.startDate ? ` AND ft.registered_at >= '${filter.startDate}'` : ``}
//                             ${
//                                 filter.endDate
//                                     ? ` AND ft.registered_at < DATE_ADD('${filter.endDate}', INTERVAL 1 DAY)`
//                                     : ``
//                             }
//                             ${filter.isPublished ? ` AND is_published = '${filter.isPublished}'` : ``}
//                             ${filter.week ? ` AND week = ${filter.week}` : ``}
//                         `
//         const [total] = await conn.query(totalQuery)

//         const query = `SELECT
//                             id,
//                             CASE
//                                 WHEN is_published = 'N' THEN '미발행'
//                                 WHEN is_published = 'Y' THEN '발행 완료'
//                                 WHEN is_published = 'W' THEN '발행 예약'
//                             END AS publishStatus,
//                             ft.week, IFNULL(ft.title, '') AS title,
//                             ft.register, a.registerName,
//                             DATE_FORMAT(ft.registered_at, '%y.%m.%d %H:%i') AS registeredAt,
//                             IF(ft.updated_at IS NULL, '', DATE_FORMAT(ft.updated_at, '%y.%m.%d %H:%i')) AS updatedAt
//                         FROM figk_trend AS ft
//                         LEFT JOIN (SELECT id AS a_id, name AS registerName FROM admin) AS a ON ft.register = a.a_id
//                         WHERE is_deleted = 'N'
//                         ${filter.title ? ` AND ft.title LIKE '%${filter.title}%'` : ``}
//                         ${filter.startDate ? ` AND ft.registered_at >= '${filter.startDate}'` : ``}
//                         ${filter.endDate ? ` AND ft.registered_at < DATE_ADD('${filter.endDate}', INTERVAL 1 DAY)` : ``}
//                         ${filter.isPublished ? ` AND is_published = '${filter.isPublished}'` : ``}
//                         ${filter.week ? ` AND week = ${filter.week}` : ``}
//                         ORDER BY ft.registered_at DESC
//                         ${filter.page && filter.per ? attachOffsetLimit(filter.page, filter.per) : ''}
//                     `
//         const [list] = await conn.query(query)

//         return { summary: summary[0], total: total[0].totalCount, list } || null
//     } catch (err) {
//         throw new ServerError(`Error[sql/figk/textFigk/getAdminTrendFigkList] : ${err}`)
//     } finally {
//         if (conn) await conn.release()
//     }
// }

// export const publishTrendFigk = async (data: { publishStatus: string; figkId: number; publisher: number }) => {
//     let conn = null
//     try {
//         conn = await db.getConnection()
//         if (!conn) throw new ServerError('db connection error')

//         const [[isExist]] = await conn.query(`SELECT
//                                                 id
//                                             FROM figk_trend
//                                             WHERE id = ${data.figkId}
//                                             AND is_deleted = 'N'`)
//         if (!isExist) throw new ConflictError('존재하지 않거나 삭제된 Trend Figk 입니다.')

//         const [alreadyPublish] = await conn.query(`SELECT
//                                                     id
//                                                 FROM figk_trend
//                                                 WHERE is_published = 'Y'
//                                                 AND id = ${data.figkId}`)
//         if (alreadyPublish.length) throw new ConflictError('이미 발행된 TrendFigk 입니다.')

//         // 발행일, 발행자 추가, 발행 상태 변경
//         await conn.query(`UPDATE
//                             figk_trend
//                         SET
//                             is_published = '${data.publishStatus}',
//                             published_at = NOW() , publisher = ${data.publisher}
//                         WHERE id = ${data.figkId}`)

//         // trend 주차 +1
//         await conn.query(`UPDATE config SET trend_week = trend_week +1`)

//         await conn.commit()
//     } catch (err) {
//         await conn.rollback()

//         if (err instanceof BadRequestError) throw new BadRequestError(err.message)
//         else if (err instanceof ConflictError) throw new ConflictError(err.message)
//         else throw new ServerError(`Error[sql/figk/trendFigk/publishTrendFigk]`)
//     } finally {
//         if (conn) await conn.release()
//     }
// }

// export const trendFigkAutoPublish = async () => {
//     let conn = null

//     try {
//         conn = await db.getConnection()

//         if (!conn) throw 'db connection error'

//         const query = `UPDATE
//                             figk_trend
//                         SET
//                             is_published = 'Y',
//                             published_at = NOW()
//                         WHERE is_deleted = 'N'
//                         AND is_published = 'W'`

//         await conn.query(query)

//         await conn.query(`UPDATE config SET trend_week = trend_week + 1`)
//     } catch (err) {
//         if (err instanceof BadRequestError) throw new BadRequestError(err.message)
//         else if (err instanceof ConflictError) throw new ConflictError(err.message)
//         else throw new ServerError(`Error[sql/figk/trendFigk/trendFigkAutoPublish] : ${err}`)
//     } finally {
//         if (conn) await conn.release()
//     }
// }

// [23.04.24 njw] trend figk 삭제
