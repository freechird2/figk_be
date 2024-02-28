import { attachOffsetLimit, sendMail } from 'function/shared'
import { getTextFigkJoin, getTextFigkSelectDetail } from 'middleSql/textFigk'
import { BadRequestError, ConflictError, ServerError } from 'model/common/error'
import { CommonFigkParamModel } from 'model/figk/common'
import { TextFigkDataModel } from 'model/figk/textFigkModel'
import { TextFigkPublishParamModel } from 'model/figk/textFigkPublishParamModel'

import { voteData } from 'model/figk/vote'
import { SendMailOptions } from 'nodemailer'
import { deleteTagRelation, getTags, insertTagRelation, updateTagRelation } from 'sql/common/tags'
import { crudLog } from 'sql/log/crudLog'
import { insertVoteLog } from 'sql/log/voteLog'
import { logger } from '../../../config/logger'
import db from '../../database'
import { totalAmount } from './payment'
import { getTagsId } from './tag'

// Text Figk detail / list sql
export const getTextFigkList = async (filter: Partial<CommonFigkParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        if (filter.id) {
            const [isExist] = await conn.query(`SELECT id FROM figk_text WHERE id = ${filter.id} AND is_deleted = 'N'`)
            if (!isExist.length) throw new ConflictError('조회할 수 없는 Text Figk ID 입니다.')
        }

        const commonWhere = `${filter.isPublished ? ` AND ft.is_published = '${filter.isPublished}'` : ``}
                            ${
                                filter.id
                                    ? ` AND ft.id = ${filter.id} 
                                    ${filter.authorId ? `AND author_id = ${filter.authorId}` : ``}`
                                    : `${filter.isContest ? ` AND status != 'N'` : ``}
                                        ${
                                            filter.startDate
                                                ? ` AND ft.${
                                                      filter.isAuthor
                                                          ? `updated_at`
                                                          : filter.dateType === 'U'
                                                          ? 'updated_at'
                                                          : filter.dateType === 'A'
                                                          ? 'applied_at'
                                                          : 'registered_at'
                                                  } >= '${filter.startDate}'`
                                                : ``
                                        }
                                        ${
                                            filter.endDate
                                                ? ` AND ft.${
                                                      filter.isAuthor
                                                          ? `updated_at`
                                                          : filter.dateType === 'U'
                                                          ? 'updated_at'
                                                          : filter.dateType === 'A'
                                                          ? 'applied_at'
                                                          : 'registered_at'
                                                  } < DATE_ADD('${filter.endDate}', INTERVAL 1 DAY)`
                                                : ``
                                        }
                                        ${filter.week ? ` AND week = ${filter.week}` : ''}
                                        ${filter.authorId ? ` AND author_id = ${filter.authorId}` : ''}
                                        ${
                                            filter.word
                                                ? ` AND (
                                                        title LIKE '%${filter.word}%'
                                                        OR sub_title LIKE '%${filter.word}%'
                                                        OR content LIKE '%${filter.word}%'
                                                        OR ft.id IN (SELECT figk_id
                                                            FROM figk_tag_relation
                                                            WHERE tag_id = (SELECT id
                                                                            FROM tags 
                                                                            WHERE name = '${filter.word}')
                                                                            AND type = 1 )
                                                                            
                                                        ${!filter.isAuthor ? `OR a.authorName LIKE '%${filter.word}%'` : ``}
                                                    )`
                                                : ''
                                        }
                                        ${
                                            filter.isAuthor
                                                ? `${
                                                      filter.status
                                                          ? filter.status === 'E' || filter.status === 'C'
                                                              ? `AND (status = 'E' OR status = 'C')`
                                                              : `AND status = '${filter.status}'`
                                                          : ``
                                                  }`
                                                : ``
                                        }`
                            }`

        const totalQuery = `SELECT 
                                COUNT(result.id) AS totalCount
                            FROM (
                                SELECT
                                    ft.id
                                FROM figk_text AS ft
                                    ${getTextFigkJoin}
                                WHERE is_deleted = 'N'
                                ${commonWhere} 
                                GROUP BY ft.id
                            ) AS result
                            `

        const [total] = await conn.query(totalQuery)

        const query = `SELECT 
                            ft.id,
                            ft.title,
                            sub_title AS subTitle, 
                            content,
                            a.authorName,
                            ft.author_id AS authorId,
                            ft.week,
                            ft.is_published AS isPublished
                            ${
                                filter.isAuthor
                                    ? `,
                                        status,
                                        DATE_FORMAT(ft.registered_at, '%y.%m.%d %H:%i') AS registeredAt,
                                        IFNULL(DATE_FORMAT(ft.updated_at, '%y.%m.%d %H:%i'), '') AS updatedAt                                     
                                    `
                                    : ``
                            }
                            ${
                                filter.isAdmin
                                    ? `
                                        , IFNULL(a.groupName,'') AS groupName,
                                        a.authorEmail,
                                        total_vote AS totalVote, 
                                        ft.view,
                                        ft.shared,
                                        ft.like,
                                        ft.status AS contestStatus,
                                        IFNULL(p.publisher, '') AS publisher,
                                        ft.is_published AS isPublished,
                                        IFNULL(DATE_FORMAT(ft.published_at, '%y.%m.%d %H:%i'), '') AS publishedAt,
                                        DATE_FORMAT(ft.registered_at, '%y.%m.%d %H:%i') AS registeredAt,
                                        IFNULL(DATE_FORMAT(ft.updated_at, '%y.%m.%d %H:%i'), '') AS updatedAt
                                    `
                                    : ``
                            }
                            ${
                                filter.isSearch
                                    ? ``
                                    : `   
                                    ,IFNULL(link, '') AS link
                                `
                            }
                        FROM figk_text AS ft
                            ${getTextFigkJoin}
                        WHERE ft.is_deleted = 'N'
                        ${commonWhere}   
                        GROUP BY ft.id                    
                        ORDER BY ${
                            filter.isAuthor
                                ? `ft.updated_at DESC`
                                : filter.isPublished === 'Y'
                                ? `week DESC, ${
                                      filter.imageUpload ? `ft.total_vote DESC, ` : ``
                                  } ft.published_at DESC, ft.applied_at ASC, ft.registered_at ASC, ft.id ASC`
                                : `ft.registered_at`
                        }
                        ${filter.page && filter.per ? attachOffsetLimit(filter.page, filter.per) : ''}`

        let [res] = await conn.query(query)

        const getTagResult = await getTags(conn, res, 1)
        if (!getTagResult) throw new ServerError('get tag error')

        let artFigk = null

        if (filter.id) {
            artFigk = await conn.query(
                `SELECT 
                    fa.id,
                    week,
                    IFNULL(title,'') AS title,
                    f.file_transed_name AS jacketUrl
                FROM figk_art AS fa
                LEFT JOIN files AS f ON fa.jacket_file_id = f.id
                WHERE is_deleted = 'N'
                AND is_published = 'Y'
                ORDER BY published_at DESC
                LIMIT 1`
            )
        }
        let isFirst = false

        if (filter.isAuthor) {
            const [[firstRes]] = await conn.query(`SELECT 
                                                        IF(COUNT(id) > 0, false, true) AS isFirst
                                                    FROM figk_text
                                                    WHERE author_id = ${filter.authorId}
                                                    AND is_deleted = 'N'`)
            isFirst = firstRes.isFirst ? true : false
        }

        return { list: res, artFigk, total: total[0].totalCount, isFirst } || null
    } catch (err) {
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        else if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else throw new ServerError(`Error[sql/figk/textFigk/getTextFigkList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getMoreAuthorsTextFigk = async (authorId: number, figkId: number) => {
    let conn = null
    let result = []

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError('db connection error')

        const [res] = await conn.query(`SELECT 
                                            id, title, week, DATE_FORMAT(published_at, '%y.%m.%d %H:%i') AS publishedAt
                                        FROM figk_text
                                        WHERE is_deleted = 'N'
                                        AND is_published = 'Y'
                                        AND author_id = ${authorId}
                                        AND id != ${figkId}
                                        ORDER BY is_published DESC, applied_at DESC, registered_at DESC
                                        LIMIT 3`)

        result = res || []
    } catch (err) {
        throw new ServerError(`Error[sql/figk/textFigk/getMoreAuthorsTextFigk] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

// Text Figk create sql
export const createTextFigk = async (data: Omit<TextFigkDataModel, 'id'>) => {
    let result = 1
    let conn = null
    let tags = ''

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError('db connection error')

        await conn.beginTransaction()

        const [author] = await conn.query(`SELECT COUNT(id) AS cnt FROM author WHERE is_deleted = 'N' AND id = ${data.register}`)

        if (author[0].cnt < 1) throw new ConflictError('존재하지 않는 작가 정보입니다.')

        if (data.tags) {
            let tagArr = data.tags.split(',')

            if (tagArr.length > 0) {
                tagArr.map((t, i) => {
                    tagArr[i] = t.trim()
                })

                tags = await getTagsId(tagArr)
            }
        }

        const title = data.title.replace(/'/g, '‘').replace(/"/g, '“')
        const content = data.content.replace(/'/g, '‘').replace(/"/g, '“')
        const subTitle = data.subTitle ? data.subTitle.replace(/'/g, '‘').replace(/"/g, '“') : ''

        const [res] = await conn.query(
            `INSERT  
                figk_text
            SET
                author_id = ${data.register},
                title = '${title}',
                ${data.subTitle ? `sub_title = '${subTitle}', ` : ``}
                ${data.link ? `link = '${data.link}', ` : ``}
                ${tags ? `tags = '${tags}', ` : ``}
                content = '${content}'
            `
        )
        if (res.insertId) {
            await insertTagRelation(conn, res.insertId, 1)
        } else {
            throw 'tag relation insert error'
        }

        await conn.commit()
        crudLog({ userId: Number(data.register), userType: Number(data.userType), type: 'T', action: 'C' })
        result = res.insertId
    } catch (err) {
        await conn.rollback()
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/textFigk/createTextFigk] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

// Text Figk update sql
export const updateTextFigk = async (data: Partial<TextFigkDataModel>) => {
    let result = 0
    let conn = null
    let tags = ''

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError('db connection error')
        const [getTextFigk] = await conn.query(
            `SELECT 
                id, 
                week,
                author_id,
                status,
                is_published
            FROM figk_text 
            WHERE id = ${data.id} 
            AND is_deleted = 'N'`
        )
        if (!getTextFigk[0]) throw new ConflictError('존재하지 않는 Text Figk이에요.')

        const [getPeriod] = await conn.query(`SELECT text_week, process_status FROM config`)

        if (!data.isAdmin) {
            if (getTextFigk[0].author_id !== data.register) throw new ConflictError('글쓴이만 수정 가능합니다.')

            // 송고 가능(A) 기간이고, 이번 주에 등록한 게시글만 수정할 수 있음
            if (getTextFigk[0].status !== 'N') {
                if (getTextFigk[0].week !== getPeriod[0].text_week || getPeriod[0].process_status !== 'A')
                    throw new ConflictError('수정할 수 없는 기간입니다.')
            }
            if (getTextFigk[0].is_published === 'Y') throw new ConflictError('미발행인 Text Figk만 수정이 가능합니다.')
        }
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

        const title = data.title.replace(/'/g, '‘').replace(/"/g, '“')
        const content = data.content.replace(/'/g, '‘').replace(/"/g, '“')
        const subTitle = data.subTitle ? data.subTitle.replace(/'/g, '‘').replace(/"/g, '“') : ''

        const [res] = await conn.query(
            `UPDATE 
                figk_text
            SET
                title = '${title}',
                sub_title = ${data.subTitle ? `'${subTitle}'` : `NULL`},
                content = '${content}',
                link = ${data.link ? `'${data.link}'` : `NULL`},
                tags = '${tags}',
                updated_at = NOW()
            WHERE id = ${data.id}
            `
        )

        if (res.affectedRows) {
            const updateTag = await updateTagRelation(conn, data.id, 1)
            if (!updateTag) throw new ServerError('tag relation update error')
        } else throw new ServerError('update error')

        await conn.commit()
        result = data.id
        crudLog({ userId: Number(data.register), userType: Number(data.userType), type: 'T', action: 'U' })
    } catch (err) {
        await conn.rollback()
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        throw new ServerError(`Error[sql/figk/textFigk/updateTextFigk] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

// Text Figk delete sql
export const deleteTextFigk = async (data: { ids: number[]; userId: number; userType: number; isAdmin?: boolean }) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError('db connection error')

        const [getTextFigk] = await conn.query(
            `SELECT 
                id, 
                week,
                author_id,
                status,
                is_published
            FROM figk_text 
            WHERE id IN (${data.ids})
            AND is_deleted = 'N'`
        )
        if (!getTextFigk.length) {
            throw new ConflictError('이미 삭제되었거나 존재하지 않는 Text Figk이에요.')
        }
        const [getPeriod] = await conn.query(`SELECT text_week, process_status FROM config`)
        if (!data.isAdmin) {
            if (getTextFigk[0].status !== 'N') {
                if (getTextFigk[0].week !== getPeriod[0].text_week || getPeriod[0].process_status !== 'A')
                    throw new ConflictError('삭제할 수 없는 기간입니다.')
                if (getTextFigk[0].is_published === 'Y') throw new ConflictError('미발행인 Text Figk만 삭제가 가능합니다.')
                if (getTextFigk[0].author_id !== data.userId) throw new ConflictError('글쓴이만 수정 가능합니다.')
            }
        }
        await conn.beginTransaction()

        const [res] = await conn.query(
            `UPDATE 
                figk_text
            SET
                is_deleted = 'Y'
            WHERE id IN (${data.ids.join()})
            AND is_deleted = 'N'
            `
        )
        if (res.changedRows !== data.ids.length) throw new ConflictError('이미 삭제된 textFigk가 있습니다.')

        const deleteTag = await deleteTagRelation(conn, data.ids, 1)

        // 관리자 삭제라면 textFigkId 에 해당하는 payment detail 삭제
        await conn.query(
            `UPDATE 
                    payment_detail
                SET is_deleted = 'Y'
                WHERE text_figk_id IN (${data.ids.join()})
                AND is_deleted = 'N'`
        )
        // 글 삭제 시 정산도 삭제 transaction 에 포함하지 않아야 반영이 됨...
        const [getPaymentId] = await conn.query(
            `SELECT 
                id 
            FROM payment 
            WHERE is_deleted = 'N'
            AND author_id = ${data.userId}
            AND week = (SELECT text_week FROM config)`
        )

        if (getPaymentId.length) {
            // 정산 detail 삭제
            await conn.query(`UPDATE payment_detail
                        SET is_deleted = 'Y'
                        WHERE text_figk_id IN (${data.ids.join()})
                        AND is_deleted = 'N'`)
            // 총 정산금 수정
        }
        await totalAmount(conn)

        if (deleteTag) {
            await conn.commit()
        } else {
            throw new ServerError('tag relation delete error')
        }

        crudLog({ userId: Number(data.userId), userType: Number(data.userType), type: 'T', action: 'D' })
        return res.affectedRows
    } catch (err) {
        await conn.rollback()

        if (err instanceof ConflictError) throw new ConflictError(err.message)
        throw new ServerError(`Error[sql/figk/textFigk/deleteTextFigk] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// Text Figk publish sql
export const publishTextFigk = async (data: TextFigkPublishParamModel) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError('db connection error')

        // 발행 여부 확인
        const [check] = await conn.query(
            `SELECT 
                COUNT(id) AS cnt
            FROM figk_text
            WHERE is_deleted = 'N'
            AND id IN (${data.ids.join(',')})
            AND (is_published = 'Y' OR is_published = 'W')
            `
        )
        if (check[0] && check[0].cnt > 0) throw new ConflictError('이미 발행된 Text Figk이 포함되어 있습니다.')

        await conn.beginTransaction()

        const [res] = await conn.query(
            `UPDATE 
                figk_text
            SET
                status = 'P',
                is_published = '${data.publishStatus}',
                ${data.publishStatus === 'Y' ? `published_at = NOW(),` : ``} 
                publisher = ${data.publisher}
            WHERE is_deleted = 'N'
            AND id IN (${data.ids.join(',')})
            `
        )

        if (res.changedRows < 1) throw new ConflictError('삭제되었거나 존재하지 않는 Text Figk입니다.')

        await conn.commit()
    } catch (err) {
        await conn.rollback()
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        throw new ServerError(`Error[sql/figk/textFigk/publishTextFigk] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
export const getAdminTextFigkMainSummary = async (filter: Partial<CommonFigkParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError('db connection error')

        // 상단 summary
        const summaryQuery = `SELECT 
                                COUNT(id) AS totalCount,
                                SUM(view) AS totalView,
                                COUNT(CASE WHEN is_published = 'N' THEN 1 END) AS notPublishedCount,
                                COUNT(CASE WHEN is_published = 'Y' THEN 1 END) AS publishedCount
                            FROM figk_text AS ft
                                LEFT JOIN (
                                    SELECT
                                        id AS a_id, group_id
                                    FROM author
                                    WHERE is_deleted = 'N'
                                ) AS author
                                ON ft.author_id = author.a_id
                            WHERE is_deleted = 'N'
                            ${filter.title ? ` AND ft.title LIKE '%${filter.title}%'` : ``}
                            ${filter.startDate ? `AND ft.updated_at  >= '${filter.startDate}'` : ``}
                            ${filter.endDate ? `AND ft.updated_at < DATE_ADD ('${filter.endDate}', INTERVAL 1 DAY)` : ``}
                            ${filter.isPublished ? ` AND is_published = '${filter.isPublished}'` : ``}
                            ${filter.status ? ` AND status = '${filter.status}'` : ``}
                            ${filter.groupId ? ` AND author.group_id = ${filter.groupId}` : ``}
                            ${filter.week ? `AND week = ${filter.week}` : ``}
                            `

        let [summary] = await conn.query(summaryQuery)

        if (summary[0]) summary[0].totalView = Number(summary[0].totalView)

        return summary[0]
    } catch (err) {
        throw new ServerError(`Error[sql/figk/textFigk/getAdminTextFigkMainSummary] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getAdminTextFigkContestSummary = async (filter: Partial<CommonFigkParamModel>) => {
    let conn = null
    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError('db connection error')

        // 상단 summary
        const summaryQuery = `SELECT 
                                COUNT(id) AS totalCount,
                                COUNT(CASE WHEN status = 'P' THEN 1 END) AS passCount,
                                COUNT(CASE WHEN status = 'F' THEN 1 END) AS nonPassCount
                            FROM figk_text AS ft
                                LEFT JOIN (
                                    SELECT
                                        id AS a_id, group_id
                                    FROM author
                                    WHERE is_deleted = 'N'
                                ) AS author
                                ON ft.author_id = author.a_id
                            WHERE is_deleted = 'N'
                            AND status != 'N' 
                            ${filter.title ? ` AND ft.title LIKE '%${filter.title}%'` : ``}
                            ${filter.startDate ? `AND ft.applied_at  >= '${filter.startDate}'` : ``}
                            ${filter.endDate ? `AND ft.applied_at < DATE_ADD ('${filter.endDate}', INTERVAL 1 DAY)` : ``}
                            ${filter.isPublished ? ` AND is_published = '${filter.isPublished}'` : ``}
                            ${filter.status ? ` AND status = '${filter.status}'` : ``}
                            ${filter.groupId ? ` AND author.group_id = ${filter.groupId}` : ``}
                            ${filter.week ? `AND week = ${filter.week}` : ``}
                            `

        let [summary] = await conn.query(summaryQuery)
        return summary[0]
    } catch (err) {
        throw new ServerError(`Error[sql/figk/textFigk/getAdminTextFigkContestSummary] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getAdminTextFigkList = async (filter: Partial<CommonFigkParamModel>) => {
    let conn = null
    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError('db connection error')

        const commonWhere = `
                            ${filter.isContest ? ` AND status != 'N'` : ``}
                            ${
                                filter.startDate
                                    ? `AND ft.${
                                          filter.dateType
                                              ? `${
                                                    filter.isContest
                                                        ? `applied_at`
                                                        : `${filter.dateType === 'U' ? `updated_at` : `registered_at`} `
                                                }`
                                              : `updated_at`
                                      } >= '${filter.startDate}'`
                                    : ``
                            }                                      
                            ${
                                filter.endDate
                                    ? `AND ft.${
                                          filter.dateType
                                              ? `${
                                                    filter.isContest
                                                        ? `applied_at`
                                                        : `${filter.dateType === 'U' ? `updated_at` : `registered_at`}`
                                                }`
                                              : `updated_at`
                                      } < DATE_ADD ('${filter.endDate}', INTERVAL 1 DAY)`
                                    : ``
                            }
                            ${
                                filter.word
                                    ? ` AND (ft.title LIKE '%${filter.word}%' 
                                        OR author.name LIKE '%${filter.word}%' 
                                        OR author.nickname LIKE '%${filter.word}%'
                                        OR author.email LIKE '%${filter.word}%')`
                                    : ``
                            }
                            ${filter.isPublished ? ` AND is_published = '${filter.isPublished}'` : ``}
                            ${filter.status ? ` AND status = '${filter.status}'` : ``}
                            ${filter.groupId ? ` AND author.group_id = ${filter.groupId}` : ``}
                            ${filter.authorId ? ` AND author_id = ${filter.authorId}` : ``}
                            ${filter.week ? `AND week = ${filter.week}` : ``}
                            `

        // 검색 조건의 total count
        const totalQuery = `SELECT 
                                COUNT(id) AS totalCount
                            FROM figk_text AS ft
                                LEFT JOIN (SELECT id AS a_id, group_id, email, name, nickname FROM author WHERE is_deleted = 'N') 
                                    AS author ON ft.author_id = author.a_id
                            WHERE is_deleted = 'N'
                            ${commonWhere}
                        `

        const [total] = await conn.query(totalQuery)

        const query = `SELECT 
                        id, 
                        is_published AS isPublished,
                        status AS contestStatus,
                        week,
                        ${filter.isContest ? `total_vote AS totalVote,` : ``}
                        title,
                        IFNULL(author.groupName, '') AS groupName,
                        IFNULL(author.email,'') AS authorEmail,
                        IFNULL(author.name,'') AS authorName,
                        IFNULL(author.nickname,'') AS authorNickName,
                        DATE_FORMAT(registered_at, '%y.%m.%d %H:%i') AS registeredAt,
                        IF(updated_at IS NULL, '', DATE_FORMAT(updated_at, '%y.%m.%d %H:%i')) AS updatedAt,
                        IF(applied_at IS NULL, '', DATE_FORMAT(applied_at, '%y.%m.%d %H:%i')) AS appliedAt
                        ${filter.isContest ? `, IF(applied_at IS NULL, '', DATE_FORMAT(applied_at, '%y.%m.%d %H:%i')) AS appliedAt` : ``}
                    FROM figk_text AS ft
                        LEFT JOIN (
                            SELECT
                                id AS a_id, email, name, nickname, group_id, g.groupName
                            FROM author AS c_author
                                LEFT JOIN (
                                    SELECT
                                        id AS g_id, name AS groupName
                                    FROM author_group
                                    WHERE is_deleted = 'N'
                                ) AS g
                                ON c_author.group_id = g.g_id
                            WHERE is_deleted = 'N'
                        ) AS author
                        ON ft.author_id = author.a_id
                    WHERE is_deleted = 'N'
                    ${commonWhere}
                    ORDER BY
                    ${!filter.isContest ? `ft.updated_at DESC` : `ft.week DESC, `}
                    ${filter.isContest ? (filter.orderType === 'V' ? 'ft.total_vote DESC, ft.applied_at ASC' : 'ft.applied_at ASC') : ''}
                    ${filter.page && filter.per ? attachOffsetLimit(filter.page, filter.per) : ''}
                    `

        const [list] = await conn.query(query)

        return { total: total[0].totalCount, list } || null
    } catch (err) {
        throw new ServerError(`Error[sql/figk/textFigk/getAdminTextFigkList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const checkFigkRegister = async (figkId: number, authorId: number) => {
    let result = false
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError('db connection error')

        const [res] = await conn.query(
            `SELECT 
                COUNT(id) AS cnt
            FROM figk_text
            WHERE is_deleted = 'N'
            AND id = ${figkId}
            AND author_id = ${authorId}`
        )

        if (res[0].cnt > 0) result = true
    } catch (err) {
        throw new ServerError(`Error[sql/figk/textFigk/checkFigkRegister] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

export const applyTextFigk = async (figkId: number, authorId: number = null) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError('db connection error')

        const [isExist] = await conn.query(
            `SELECT 
                id 
            FROM figk_text 
            WHERE id = ${figkId} 
            AND is_deleted = 'N'`
        )

        if (!isExist.length) throw new ConflictError('존재하지 않거나 삭제된 TextFigk입니다.')

        const [period] = await conn.query(
            `SELECT 
                process_status 
            FROM config`
        )
        if (period[0].process_status !== 'A') throw new ConflictError('송고 가능한 기간이 아닙니다.')

        const [appliedFigk] = await conn.query(
            `SELECT 
                id, 
                status 
            FROM figk_text 
            WHERE id = ${figkId} `
        )

        if (appliedFigk[0].status === 'E') {
            throw new ConflictError('이미 송고신청한 글입니다.')
        }

        if (authorId) {
            const [validAuthor] = await conn.query(
                `SELECT 
                    author_id, 
                    a.group_id, 
                    (SELECT 
                        current_group_id 
                    FROM config) AS current_group_id 
                FROM figk_text AS ft
                    LEFT JOIN (
                        SELECT
                            id AS a_id, 
                            group_id
                        FROM author
                    ) AS a
                    ON ft.author_id = a.a_id
                WHERE id = ${figkId}`
            )

            if (!validAuthor.length) return 0
            else if (authorId !== validAuthor[0].author_id) throw new ConflictError('작성자만 송고 신청할 수 있습니다.')
            else if (validAuthor[0].group_id !== validAuthor[0].current_group_id)
                throw new ConflictError('작가가 속한 그룹의 송고 기간이 아닙니다.')
        }

        const [getConfig] = await conn.query(
            `SELECT 
                text_week, 
                max_apply,
                apply_pay
            FROM config`
        )
        const [maxApply] = await conn.query(
            `SELECT COUNT(id) AS totalCount 
            FROM payment 
            WHERE author_id = ${authorId} 
            AND week = ${getConfig[0].text_week}`
        )

        if (maxApply[0].totalCount >= getConfig[0].max_apply)
            throw new ConflictError(`최대 ${getConfig[0].max_apply}개까지 송고 지원이 가능합니다.`)

        await conn.beginTransaction()

        const [res] = await conn.query(
            `UPDATE 
                figk_text
            SET
                status = 'E',
                week = (SELECT text_week FROM config),
                applied_at = NOW()
            WHERE is_deleted = 'N' 
            AND id = ${figkId}
            ${authorId ? ` AND author_id = ${authorId}` : ``}`
        )

        if (res.affectedRows < 1) return false

        await conn.commit()

        return true
    } catch (err) {
        await conn.rollback()

        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/textFigk/applyTextFigk] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const applyFigkList = async () => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        const [res] = await conn.query(
            `SELECT 
                ft.id,
                title,
                sub_title AS subTitle,
                content,
                link,
                IF(a.nickname IS NULL OR a.nickname = '', a.name, a.nickname) AS authorName
            FROM figk_text AS ft
            LEFT JOIN author AS a ON a.id = ft.author_id 
            WHERE week = (SELECT text_week FROM config)
            AND ft.status = 'E'
            AND ft.is_deleted = 'N'
            ORDER BY ft.applied_at DESC`
        )

        const getTagResult = await getTags(conn, res, 1)
        if (!getTagResult) throw new ServerError('get tag error')

        return res
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/textFigk/applyFigkList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const textFigkStartApply = async () => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError('db connection error')

        await conn.beginTransaction()

        const [isPause] = await conn.query(`SELECT is_pause AS isPause FROM config`)

        if (isPause[0].isPause === 'Y') {
            await conn.query(`UPDATE config SET is_pause = 'N', process_status = 'P'`)
        } else {
            const nextGroupQuery = `SELECT 
                                        id, 
                                        name, 
                                        \`order\`, 
                                        a.cnt
                                    FROM author_group AS ag
                                        LEFT JOIN (
                                            SELECT
                                                COUNT(*) AS cnt, group_id
                                            FROM author
                                            WHERE is_deleted = 'N'
                                            GROUP BY group_id
                                        ) AS a
                                        ON ag.id = a.group_id
                                    WHERE is_deleted = 'N'
                                    AND \`order\` > (SELECT \`order\` FROM author_group WHERE id = (SELECT current_group_id FROM config))
                                    AND a.cnt > 0
                                    ORDER BY ag.order
                                    LIMIT 1`

            const [groupRes] = await conn.query(nextGroupQuery)

            let groupId = null

            if (!groupRes.length) {
                const minGroupQuery = `SELECT 
                                            MIN(\`order\`) AS minId
                                        FROM author_group AS ag
                                            LEFT JOIN (
                                                SELECT
                                                    COUNT(*) AS cnt, group_id
                                                FROM author
                                                WHERE is_deleted = 'N'
                                                GROUP BY group_id
                                            ) AS a
                                            ON ag.id = a.group_id
                                        WHERE is_deleted = 'N'
                                        AND a.cnt > 0`

                const [minRes] = await conn.query(minGroupQuery)
                groupId = minRes[0].minId
            } else {
                groupId = groupRes[0].id
            }

            await conn.query(`UPDATE 
                                config
                            SET
                                process_status = 'A', 
                                text_week = text_week + 1,
                                current_group_id = ${groupId}`)
        }

        logger.verbose(`Process: ${isPause[0].isPause === 'Y' ? '투표 중지' : '지원 가능'}`)
        await conn.commit()
    } catch (err) {
        await conn.rollback()
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/textFigk/textFigkAutoPublish] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const maxApplyFigk = async (authorId: number) => {
    let conn = null

    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        const [res] = await conn.query(
            `SELECT 
                COUNT(id) AS total
            FROM figk_text 
            WHERE author_id = ${authorId} 
            AND week = (SELECT text_week FROM config)
            AND status = 'E'
            AND is_deleted = 'N'`
        )
        if (res[0].total >= 3) throw new ConflictError('최대 송고 가능 글은 3개입니다.')

        return true
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/textFigk/maxApplyFigk] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getIsLastWithWeek = async (week: number) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError('db connection error')

        const query = `SELECT 
                            COUNT(*) AS cnt
                        FROM
                            figk_text
                        WHERE is_deleted = 'N'
                        AND is_published = 'Y'
                        AND week = ${week - 1}
                    `
        const [res] = await conn.query(query)

        return res[0].cnt > 0 ? false : true
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/textFigk/getIsLastWithWeek] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

//  FIGK송고 - 당/낙선작 불러오기
export const totalTextFigk = async (param: Partial<CommonFigkParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError('db connection error')

        const commonWhere = `WHERE ft.is_deleted = 'N' AND ${
            param.status ? (param.status === 'P' ? `ft.status = 'P'` : `ft.status = 'F'`) : `(ft.status = 'P' OR ft.status = 'F')`
        }
        ${param.week ? `AND week = ${param.week}` : ``}
        ${param.status ? `AND ft.status = '${param.status}'` : ``}
        ${
            param.word
                ? ` AND(ft.title LIKE '%${param.word}%'
                    OR ft.sub_title LIKE '%${param.word}%'
                    OR ft.content LIKE '%${param.word}%'
                    OR author.name LIKE '%${param.word}%')
                    OR ft.id IN (SELECT figk_id
                        FROM figk_tag_relation
                        WHERE tag_id = (SELECT id
                                        FROM tags 
                                        WHERE name = '${param.word}')
                                        AND type = 1 )`
                : ``
        }`

        const totalQuery = `SELECT 
                                COUNT(ft.id) AS total
                            FROM figk_text As ft
                            LEFT JOIN author ON ft.author_id = author.id
                            ${commonWhere}

                            `

        const query = `SELECT 
                        ft.id,
                        ft.week,
                        ft.title,
                        IFNULL(ft.sub_title,'') AS subTitle,
                        IF(author.nickname IS NULL OR author.nickname = '', author.name, author.nickname) AS authorName,
                        ft.content,
                        IFNULL(ft.link,'') AS link,
                        CASE 
                            WHEN ft.status = 'E' THEN -1 ELSE ft.total_vote 
                        END AS totalVote,  
                        ft.status,
                        ft.is_published AS isPublished

                    FROM figk_text AS ft
                        LEFT JOIN author ON ft.author_id = author.id
                    ${commonWhere}
                    GROUP BY ft.id
                    ORDER BY ft.week DESC, ft.total_vote DESC, ft.applied_at ASC, ft.registered_at ASC, ft.id ASC
                    ${attachOffsetLimit(param.page, param.per)}`

        const [[totalCount]] = await conn.query(totalQuery)
        const [[thisWeek]] = await conn.query(`SELECT text_week FROM config`)

        const [res] = await conn.query(query)
        const getTagResult = await getTags(conn, res, 1)
        if (!getTagResult) throw new ServerError('get tag error')

        return {
            totalCount: totalCount.total,
            isLast: param.page * param.per >= totalCount.total,
            thisWeek: thisWeek.text_week,
            list: res,
        }
    } catch (err) {
        throw new ServerError(`Error[sql/textFigk/totalTextFigk] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// 송고 및 투표 일시정지
export const pauseVote = async (isPause: 'Y' | 'N') => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        await conn.query(
            `UPDATE config
            SET is_pause = '${isPause}'`
        )
    } catch (err) {
        throw new ServerError(`Error[sql/textFigk/pauseVote] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// 선택한 TextFigk에 투표
export const voteTextFigk = async (data: Partial<voteData>) => {
    let conn = null

    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        // 이전 투표 데이터 가져오기
        const [[beforeVote]] = await conn.query(
            `SELECT 
                voted_figk
            FROM vote
            WHERE
            ${data.isAdmin ? `admin_id = ${data.userId}` : `author_id = ${data.userId}`}
            AND week = (SELECT text_week FROM config)`
        )

        // 이미 투표했다면
        if (beforeVote) {
            throw new ConflictError('이미 투표에 참여했습니다.')
        }

        const [[getConfig]] = await conn.query(
            `SELECT 
                pool,
                process_status 
            FROM config`
        )

        // 투표 기간이 아닐경우
        if (getConfig.process_status !== 'V') throw new ConflictError('지금은 투표기간이 아닙니다.')

        // 최대 투표 개수를 지키지 않은 경우
        if (data.votedFigk.length !== getConfig.pool) throw new ConflictError(`최대 투표 개수는 ${getConfig.pool}개입니다.`)

        // 삭제, 송고 신청 하지 않은 TF, 발행된 TF, 이번 주 x, 내가 쓴 글 일 경우 에러
        const [findExist] = await conn.query(
            `SELECT 
                COUNT(*) AS isExist
            FROM figk_text
            WHERE id IN (${data.votedFigk.join(',')})
            AND is_deleted = "N"
            AND status = 'E'
            AND is_published ='N'
            AND week = (SELECT text_week FROM config)
            ${data.isAdmin ? `` : `AND author_id != ${data.userId}`}`
        )

        if (findExist[0].isExist !== data.votedFigk.length) {
            throw new ConflictError(`투표할 수 없는 Text Figk ID가 포함되어 있습니다.`)
        }

        await conn.beginTransaction()

        await conn.query(
            `INSERT INTO vote(week, voted_figk, ${data.isAdmin ? `admin_id,` : `author_id,`} registered_at)
            VALUES((SELECT text_week FROM config), '${data.votedFigk.join(',')}', ${data.userId}, NOW())`
        )
        // figk_text 테이블 totalCount 1 추가
        await conn.query(
            `UPDATE figk_text
            SET total_vote = total_vote +1
            WHERE id IN (${data.votedFigk.join(',')})`
        )

        await conn.commit()
    } catch (err) {
        await conn.rollback()
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/textFigk/voteTextFigk] : ${err.message}`)
    } finally {
        if (conn) await conn.release()
    }
}

// 진행중인 투표 list
export const getVoteTextList = async (param: Partial<CommonFigkParamModel>) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        if (param.id) {
            const [isExist] = await conn.query(
                `SELECT 
                    id 
                FROM figk_text 
                WHERE id = ${param.id} 
                AND is_deleted = 'N'`
            )
            if (!isExist.length) throw new ConflictError('조회할 수 없는 Text Figk ID 입니다.')
        }
        let graph = null

        // 관리자라면 adminId 로 조회, 아니라면 authorId로 조회
        // 관리자 또는 작가의 투표 참여여부 확인
        let [isVoted] = await conn.query(
            `SELECT 
                id 
            FROM vote 
            WHERE ${param.isAdmin ? `admin_id = ${param.userId}` : `author_id = ${param.userId}`} 
            AND week = (SELECT text_week FROM config)
          `
        )
        if (isVoted.length) isVoted = 'Y'
        else isVoted = 'N'
        // 해당 주차 text figk 불러오기
        const query = `${getTextFigkSelectDetail(param)}
                        FROM figk_text AS ft
                            LEFT JOIN author ON ft.author_id = author.id
                            LEFT JOIN author_group AS ag ON author.group_id = ag.id
                        WHERE ft.is_deleted = 'N'
                        AND ft.week = (SELECT text_week FROM config)
                        AND ft.status = 'E'
                        ${param.id ? `AND ft.id = ${param.id}` : ``} 
                        ${param.isAdmin ? `` : `AND ft.author_id != ${param.userId}`}
                        GROUP BY ft.id
                        ORDER BY ft.total_vote DESC, ft.applied_at ASC, ft.registered_at ASC
                        ${param.page && param.per ? attachOffsetLimit(param.page, param.per) : ''}`

        const [res] = await conn.query(query)

        if (!param.id) {
            graph = await getVoteGraph(res)
        } else graph = []

        const totalCount = res.length
        // tag name
        const getTagResult = await getTags(conn, res, 1)
        if (!getTagResult) throw new ServerError('get tag error')
        return param.id ? { isVoted, res } : { isVoted, isLast: param.page * param.per >= res.length, totalCount, graph, res }
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        throw new ServerError(`Error[sql/textFigk/getVoteTextList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// 투표 참여/미참여인원 확인
export const voteCheck = async (param: Partial<CommonFigkParamModel>) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        const [totalCount] = await conn.query(
            `SELECT 
               COUNT(a.id)  AS total              
            FROM author AS a
                LEFT JOIN vote AS v ON v.author_id = a.id AND week = (SELECT text_week FROM	config)
            WHERE a.is_deleted = 'N'
            AND a.status = 'Y'
            AND a.is_approve = 'Y'
            AND v.id IS ${param.type === 'O' ? `NOT` : ``} NULL
            ${param.word ? `AND (a.email LIKE '%${param.word}%' OR a.name LIKE '%${param.word}%')` : ``}`
        )

        const [voter] = await conn.query(
            `SELECT 
                a.id,
                a.email,
                IF(a.nickname IS NULL OR a.nickname = '',a.name, a.nickname) AS name,
                ${param.type === 'O' ? `IFNULL(DATE_FORMAT(v.registered_at, '%y.%m.%d %H:%i'),'') AS registeredAt,` : ``}
                IFNULL(ag.name,'') AS groupName
            FROM author AS a
                LEFT JOIN vote AS v ON v.author_id = a.id AND week = (SELECT text_week FROM	config)
                LEFT JOIN author_group AS ag ON a.group_id = ag.id
            WHERE a.is_deleted = 'N'
            AND a.status = 'Y'
            AND a.is_approve = 'Y'
            AND v.id IS ${param.type === 'O' ? `NOT` : ``} NULL
            ${param.word ? `AND (a.email LIKE '%${param.word}%' OR a.name LIKE '%${param.word}%')` : ``}
            ORDER BY v.registered_at DESC`
        )

        return { totalCount: totalCount[0].total, list: voter }
    } catch (err) {
        throw new ServerError(`Error[sql/textFigk/voteCheck] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// 투표 완료된 Text Figk List
export const voteResult = async (param: Partial<CommonFigkParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()
        if (!conn) {
            throw new ServerError(`db connection error`)
        }

        const commonWhere = `WHERE ft.is_deleted = 'N'
                            ${param.id ? `AND ft.id = ${param.id}` : `AND week = (SELECT text_week FROM config)`}`

        const [totalCount] = await conn.query(
            `SELECT 
                COUNT(ft.id) AS total
            FROM figk_text AS ft
            LEFT JOIN author ON ft.author_id = author.id
            LEFT JOIN author_group AS ag ON author.group_id = ag.id
            ${commonWhere}
            GROUP BY ft.id
            `
        )

        const [res] = await conn.query(
            `${getTextFigkSelectDetail(param)}
            FROM figk_text AS ft
                LEFT JOIN author ON ft.author_id = author.id
                LEFT JOIN author_group AS ag ON author.group_id = ag.id
            ${commonWhere}
            GROUP BY ft.id
            ORDER BY totalVote DESC, applied_at ASC, ft.registered_at ASC
            ${param.page && param.per ? attachOffsetLimit(param.page, param.per) : ''}
            `
        )
        // 그래프
        let graph = []
        if (!param.id) {
            graph.push(await getVoteGraph(res))
        }

        const getTagResult = await getTags(conn, res, 1)
        if (!getTagResult) throw new ServerError('get tag error')

        return {
            isLast: param.page * param.per >= totalCount.length,
            totalCount: totalCount.length,
            res,
            graph: graph[0],
        }
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        throw new ServerError(`Error[sql/textFigk/voteResult] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// 심사하기
export const passOrFail = async (data: { ids: Array<number>; publishStatus: string; publisher: number }) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        // 존재하지 않거나 삭제된 id, 상태가 C(완료)가 아닌, 이번 주 글이 아닌, 발행된 상태가 아닌 경우 에러
        const [passValid] = await conn.query(
            `SELECT 
                id
            FROM figk_text 
            WHERE id IN (${data.ids.join()})
            AND is_deleted = 'N' 
            AND status = 'C' 
            AND week = (SELECT text_week FROM config)
            AND is_published = 'N'`
        )

        if (data.ids.length !== passValid.length) {
            throw new BadRequestError('text figk ID 를 확인하세요.')
        }

        await conn.beginTransaction()

        // 합격, 나머지 불합격, 합격한 글 발행정보 추가
        await conn.query(
            `UPDATE 
                figk_text
            SET
                is_published = IF(id IN (${data.ids.join()}), 'Y','N'),
                status = CASE WHEN id IN (${data.ids.join()}) THEN 'P' ELSE 'F' END,
                published_at = CASE WHEN id IN (${data.ids.join()}) THEN NOW() END,
                publisher = CASE WHEN id IN (${data.ids.join()}) THEN ${data.publisher} END
            WHERE is_deleted = 'N'
            AND week = (SELECT text_week FROM config)
            AND is_published = 'N'
            AND status = 'C'`
        )

        await conn.commit()

        await insertVoteLog()
    } catch (err) {
        await conn.rollback()
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/textFigk/passOrFail] : ${err.message}`)
    } finally {
        if (conn) await conn.release()
    }
}

//  발행완료 투표 관리 리스트
export const getjudgeResult = async (param: Partial<CommonFigkParamModel>) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        // 그래프
        // const graph = await getVoteGraph('PF', param.week)

        const [res] = await conn.query(
            `${getTextFigkSelectDetail(param)}
            FROM figk_text AS ft
                LEFT JOIN author ON ft.author_id = author.id
                LEFT JOIN author_group AS ag ON author.group_id = ag.id
            WHERE ft.is_deleted = 'N'
            AND (ft.status = 'P' OR ft.status =  'F')
            ${param.id ? ` AND ft.id = ${param.id}` : ` AND week = ${param.week ?? `(SELECT text_week FROM config)`}`}
            GROUP BY ft.id
            ORDER BY totalVote DESC , ft.applied_at ASC, ft.registered_at ASC
            ${param.page && param.per ? attachOffsetLimit(param.page, param.per) : ''}
            `
        )
        const getTagResult = await getTags(conn, res, 1)
        if (!getTagResult) throw new ServerError('get tag error')

        const graph = await getVoteGraph(res)
        return { graph, isLast: param.page * param.per >= res.length, res }
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        throw new ServerError(`Error[sql/textFigk/getjudgeResult], ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const voteAdminSummary = async (status: string) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        const commonWhere = `WHERE week = (SELECT text_week FROM config)
                            AND ft.is_deleted = 'N'
                            ${
                                status === 'A'
                                    ? `AND (ft.status = 'P' OR ft.status = 'F')`
                                    : status === 'V'
                                    ? `AND ft.status = 'E'`
                                    : status === 'C'
                                    ? `AND ft.status = 'C'`
                                    : ''
                            }`

        const [thisWeek] = await conn.query(`SELECT text_week, process_status FROM config`)

        const totalQuery = `SELECT COUNT(ft.id) AS total
                            FROM figk_text AS ft
                            ${commonWhere}`

        const [[totalApply]] = await conn.query(totalQuery)

        const [authorGroup] = await conn.query(
            `SELECT 
                name AS groupName 
            FROM author_group 
            WHERE id = (SELECT current_group_id FROM config)`
        )

        const passFailQuery = `SELECT 
                                SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) AS passCount,
                                SUM(CASE WHEN status = 'F' THEN 1 ELSE 0 END) AS failCount
                                FROM figk_text AS ft
                                ${commonWhere}`

        // 총 합불 수
        const [[totalPassFail]] = await conn.query(passFailQuery)

        // 최대 투표 가능 수
        const [[pool]] = await conn.query(`SELECT pool FROM config`)

        // 총 작가 인원
        const [[totalVoter]] = await conn.query(
            `SELECT COUNT(id) AS total 
            FROM author 
            WHERE is_deleted = 'N' 
            AND is_approve = 'Y' 
            AND status = 'Y'`
        )

        // 투표 참여 인원
        const [[voter]] = await conn.query(
            `SELECT 
                COUNT(r.id) AS participants
            FROM (
                SELECT id
                FROM vote AS v
                LEFT JOIN (
                    SELECT
                        id AS a_id
                    FROM author
                    WHERE is_deleted = 'N'
                    AND status = 'Y'
                    AND is_approve = 'Y'
                ) AS a 
                ON a.a_id = v.author_id
                WHERE week = (SELECT text_week FROM config) 
                AND v.author_id IS NOT NULL
                AND a.a_id IS NOT NULL
                GROUP BY v.author_id
            ) AS r`
        )

        //투표 미참여인원
        const unVoter = totalVoter.total - voter.participants
        if (status === 'A') {
            return {
                week: thisWeek[0].text_week,
                group: authorGroup[0]?.groupName,
                status: thisWeek[0].process_status,
                maxVote: pool.pool,
                totalCount: totalApply.total,
                totalPass: Number(totalPassFail.passCount),
                totalFail: Number(totalPassFail.failCount),
                voter: voter.participants,
                unVoter,
            }
        } else {
            return {
                week: thisWeek[0].text_week,
                group: authorGroup[0]?.groupName,
                status: thisWeek[0].process_status,
                maxVote: pool.pool,
                totalCount: totalApply.total,
                voter: voter.participants,
                unVoter,
            }
        }
    } catch (err) {
        throw new ServerError(`Error[sql/textFigk/voteAdminSummary] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getVoteGraph = async (list: any[]) => {
    let conn = null

    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')
        let graphTitle = []
        let voteCount = []
        let voteStatus = []
        let author = []

        list.map((v) => {
            graphTitle.push(v.title)
            voteCount.push(v.totalVote)
            voteStatus.push(v.status)
            author.push(v.authorName)
        })

        return { figkTitle: graphTitle, author, voteCount, voteStatus }
    } catch (err) {
        throw new ServerError(`Error[sql/figk/textFigk/getVoteGraph] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const voteChecker = async (param: Partial<CommonFigkParamModel>) => {
    let conn = null
    try {
        conn = await db.getConnection()

        let isVoted = false
        const [votedUser] = await conn.query(
            `SELECT id 
            FROM vote 
            WHERE ${param.isAdmin ? `admin_id` : `author_id`} = ${param.userId} AND week = (SELECT text_week FROM config)
            `
        )

        if (votedUser.length) isVoted = true
        return isVoted
    } catch (err) {
        throw new ServerError(`Error[sql/figk/textFigk/voteChecker] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getTurnDownList = async () => {
    let conn = null
    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError('db connection error')

        const query = `SELECT 
                            ft.id,
                            ft.title,
                            IFNULL(ft.sub_title,'') AS subTitle,
                            ft.content,
                            IF(a.nickname IS NULL OR a.nickname = '', a.name, a.nickname) AS authorName  
                        FROM figk_text AS ft
                            LEFT JOIN author AS a ON ft.author_id = a.id
                        WHERE ft.is_deleted = 'N'
                        AND ft.week = (SELECT text_week FROM config) 
                        AND ft.status = 'E'
                        GROUP BY
                            ft.id
                        ORDER BY
                            ft.applied_at DESC`

        const [res] = await conn.query(query)
        const getTagResult = await getTags(conn, res, 1)
        if (!getTagResult) throw new ServerError('get tag error')

        return res
    } catch (err) {
        throw new ServerError(`Error[sql/figk/textFigk/getTurnDownList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const textFigkTurnDown = async (ids: Array<number>) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError('db connection error')

        const [[configRes]] = await conn.query(`SELECT process_status FROM config`)

        if (configRes.process_status !== 'T') throw new ConflictError('송고 심사 기간이 아닙니다.')

        await conn.beginTransaction()

        const query = `UPDATE 
                        figk_text
                    SET
                        status = 'T'
                    WHERE is_deleted = 'N'
                    AND id IN (${ids.join(',')})
                    AND status = 'E'
                    `

        const [res] = await conn.query(query)

        if (res.changedRows !== ids.length) throw new ConflictError('상태를 변경할 수 없는 Id가 포함되어 있습니다.')

        const selectQuery = `SELECT 
                                title, a.email, week, COUNT(ft.id) AS cnt
                            FROM figk_text AS ft
                                LEFT JOIN (
                                    SELECT
                                        id AS a_id, email
                                    FROM author
                                ) AS a
                                ON ft.author_id = a.a_id
                            WHERE id IN (${ids.join(',')})
                            GROUP BY a.email
                            `

        const [list] = await conn.query(selectQuery)

        list.map((l) => {
            const mailHtml = `
                        <h3>Figk Studio 송고 반려 안내</h3>
                        <p>${l.week}주차에 송고하신 '${l.title}' ${l.cnt > 1 ? `외 ${l.cnt - 1}개` : ``} 글이 반려되었습니다.</p>
                        `

            const mailOption: SendMailOptions = {
                from: '"FIGK" <figk@fig.xyz>', //your or my Email(발송자)
                to: l.email, //your or my Email(수신자)
                subject: 'Figk Studio 송고 반려 안내', // title  (발송 메일 제목)
                text: '메세지', // plain text (발송 메일 내용)
                html: mailHtml, // HTML Content (발송 메일 HTML컨텐츠)
            }

            sendMail(mailOption)
        })

        await conn.commit()
    } catch (err) {
        await conn.rollback()
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        throw new ServerError(`Error[sql/figk/textFigk/textFigkTurnDown] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// 투표 결과 로그 리스트
export const getVoteResultLogList = async (week: number) => {
    let conn = null
    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError('db connection error')

        const logQuery = /* sql */ `
                            SELECT
                                *
                            FROM vote_log
                            WHERE week = ${week}
                            `

        const [[log]] = await conn.query(logQuery)
        if (!log || !log.id) throw new BadRequestError('해당하는 주차의 투표 결과가 없습니다.')

        const figkQuery = /* sql */ `
                            SELECT 
                                ft.id,
                                ft.title,
                                IFNULL(ft.sub_title,'') AS subTitle,
                                ft.content,
                                ft.status,
                                IF(author.nickname IS NULL OR author.nickname = '', author.name, author.nickname) AS authorName,
                                IFNULL(ag.name,'') AS groupName,
                                author.email AS authorEmail,
                                total_vote AS totalVote,
                                link,
                                ft.week,
                                DATE_FORMAT(ft.applied_at, '%Y-%m-%d %H:%i') AS appliedAt
                            FROM figk_text AS ft
                                LEFT JOIN author ON ft.author_id = author.id
                                LEFT JOIN author_group AS ag ON author.group_id = ag.id
                            WHERE ft.is_deleted = 'N'
                            AND (ft.status = 'P' OR ft.status =  'F')
                            AND week = ${week}
                            GROUP BY ft.id
                            ORDER BY totalVote DESC , ft.applied_at ASC, ft.registered_at ASC, ft.id ASC
                            `

        const [res] = await conn.query(figkQuery)
        const getTagResult = await getTags(conn, res, 1)
        if (!getTagResult) throw new ServerError('get tag error')

        const graph = await getVoteGraph(res)

        let voter = []

        if (log.voter) {
            const voterQuery = /* sql */ `
                                    SELECT 
                                        a.id,
                                        a.email,
                                        IF(a.nickname IS NULL OR a.nickname = '',a.name, a.nickname) AS name,
                                        IFNULL(DATE_FORMAT(v.registered_at, '%y.%m.%d %H:%i'), '') AS registeredAt,
                                        IFNULL(ag.name,'') AS groupName,
                                        DATE_FORMAT(v.registered_at, v.registered_at) AS registeredAt
                                    FROM author AS a
                                        LEFT JOIN vote AS v ON v.author_id = a.id AND week = ${week}
                                        LEFT JOIN author_group AS ag ON a.group_id = ag.id
                                    WHERE a.id IN (${log.voter})
                                    ORDER BY a.name ASC
                                `
            const [voterList] = await conn.query(voterQuery)
            voter = voterList
        }

        let unVoter = []

        if (log.un_voter) {
            const unVoterQuery = /* sql */ `
                                    SELECT 
                                        a.id,
                                        a.email,
                                        IF(a.nickname IS NULL OR a.nickname = '',a.name, a.nickname) AS name,
                                        IFNULL(ag.name,'') AS groupName
                                    FROM author AS a
                                        LEFT JOIN author_group AS ag ON a.group_id = ag.id
                                    WHERE a.id IN (${log.un_voter})
                                    ORDER BY a.name ASC
                                `
            const [unVoterList] = await conn.query(unVoterQuery)
            unVoter = unVoterList
        }

        const summary = {
            week,
            group: log.group_name,
            totalCount: log.figk_cnt,
            voter: log.voter_cnt,
            unVoter: log.un_voter_cnt,
        }
        return { summary, graph, voter, unVoter, list: res }
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/textFigk/getVoteResultLogList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const createVoteLog = async () => {
    let conn = null
    try {
        conn = await db.getConnection()

        const query = /* sql */ `
                            SELECT
                                COUNT(id) AS cnt, GROUP_CONCAT(id) AS ids, week, 'F' AS type
                            FROM figk_text
                            WHERE is_deleted = 'N'
                            AND (status = 'P' OR status = 'F')
                            GROUP BY week

                            UNION

                            SELECT
                                COUNT(id) AS cnt, GROUP_CONCAT(author_id) AS ids, week, 'V' AS type
                            FROM vote
                            WHERE author_id IS NOT NULL 
                            AND author_id != 0
                            GROUP BY week

                            ORDER BY week ASC 
                            `

        const [res] = await conn.query(query)

        let log: any = {}

        res.map((r) => {
            if (!log[r.week]) log[r.week] = {}

            if (r.type === 'F') {
                log[r.week]['figk_cnt'] = r.cnt
                log[r.week]['figk_list'] = r.ids
                    .split(',')
                    .sort((a, b) => a - b)
                    .join(',')
            } else if (r.type === 'V') {
                log[r.week]['voter_cnt'] = r.cnt
                log[r.week]['voter'] = r.ids
                    .split(',')
                    .sort((a, b) => a - b)
                    .join(',')
            }
        })

        const tempArr = []

        for (const week in log) {
            tempArr.push(
                `(${week}, '', ${log[week].figk_cnt}, '${log[week].figk_list}', ${log[week].voter_cnt || 0}, '${
                    log[week].voter || ''
                }', 0, '')`
            )
        }

        let insertQuery = /* sql */ `
                                INSERT INTO vote_log(week, group_name, figk_cnt, figk_list, voter_cnt, voter, un_voter_cnt, un_voter) VALUES ${tempArr.join(
                                    ','
                                )}
                            `

        await conn.query(insertQuery)
        if (!conn) throw new ServerError('db connection error')
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/textFigk/createVoteLog] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
