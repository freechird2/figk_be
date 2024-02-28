import { attachOffsetLimit } from 'function/shared'
import { ConflictError, ServerError } from 'model/common/error'
import { AuthorApproveParamModel } from 'model/figk/authorApproveParamModel'
import { AuthorInviteParamModel } from 'model/figk/authorInvite'
import { CommonFigkParamModel } from 'model/figk/common'
import db from '../../database'

export const insertAuthorInviteLog = async (data: AuthorInviteParamModel) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const [[cntRes]] = await conn.query(`SELECT 
                                                id
                                            FROM author_invite_log
                                            WHERE is_deleted = 'N'
                                            AND email = '${data.email}'
                                        `)

        let query = ``

        if (!cntRes) {
            query = `INSERT 
                        author_invite_log
                    SET
                        ${data.code ? `code = '${data.code}', ` : ''}
                        email = '${data.email}',
                        register = ${data.register}
                    `
        } else {
            query = `UPDATE
                        author_invite_log
                    SET
                        ${data.register ? `register = ${data.register}, ` : ``}
                        updated_at = NOW()
                    WHERE id = ${cntRes.id}
                    `
        }

        await conn.query(query)

        return !cntRes ? 1 : 0
    } catch (err) {
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[src/sql/figk/authorInviteLog/insertAuthorInviteLog] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getAuthorInviteList = async (param: Partial<CommonFigkParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const commonQuery = `WHERE ail.is_deleted = 'N'
                            ${
                                param.id
                                    ? ` AND ail.id = ${param.id}`
                                    : ` ${
                                          param.word
                                              ? ` AND (
                                                        ail.email LIKE '%${param.word}%'
                                                        OR a.name LIKE '%${param.word}%'
                                                        OR a.nickname LIKE '%${param.word}%'
                                                        OR a.phone LIKE '%${param.word}%'
                                                    )`
                                              : ``
                                      }
                                        ${
                                            param.startDate
                                                ? ` AND ${param.dateType === 'U' ? `ail.updated_at` : `ail.registered_at`} >= '${
                                                      param.startDate
                                                  }'`
                                                : ``
                                        }
                                        ${
                                            param.endDate
                                                ? ` AND ${param.dateType === 'U' ? `ail.updated_at` : `ail.registered_at`} < DATE_ADD('${
                                                      param.endDate
                                                  }', INTERVAL 1 DAY)`
                                                : ``
                                        }
                                        ${param.approveStatus ? ` AND ail.is_approve = '${param.approveStatus}'` : ``}`
                            }
                            
                            `

        const totalQuery = `SELECT 
                                COUNT(id) AS cnt
                            FROM author_invite_log AS ail
                                LEFT JOIN (
                                    SELECT
                                        id AS a_id, name, nickname, phone, is_approve
                                    FROM author
                                    WHERE is_deleted = 'N'
                                ) AS a
                                ON ail.author_id = a.a_id
                            ${commonQuery}`

        const [total] = await conn.query(totalQuery)

        const query = `SELECT 
                            ail.id, 
                            ail.is_approve AS isApprove,
                            ail.email,
                            IFNULL(a.name, '') AS name,
                            IFNULL(a.nickname, '') AS nickname,
                            IFNULL(a.phone, '') AS phone,
                            ${
                                param.id
                                    ? `
                                        IFNULL(a.a_id, 0) AS authorId,
                                        IFNULL(a.introduction, '') AS introduction,
                                        IFNULL(a.instagram, '') AS instagram,
                                        IFNULL(a.homepage, '') AS homepage,
                                        IFNULL(a.blog, '') AS blog,
                                        IFNULL(a.profilePath, '') AS profilePath,
                                        IFNULL(a.profileOrigin, '') AS profileFileName,
                                        IFNULL(a.portfolioPath, '') AS portFolioPath,
                                        IFNULL(a.portfolioOrigin, '') AS portFolioFileName
                                    `
                                    : `
                                        DATE_FORMAT(ail.registered_at, '%y.%m.%d %H:%i') AS registeredAt,
                                        IF(ail.updated_at IS NULL, '', DATE_FORMAT(ail.updated_at, '%y.%m.%d %H:%i')) AS updatedAt
                                    `
                            }
                            
                        FROM author_invite_log AS ail
                            LEFT JOIN (
                                SELECT
                                    id AS a_id, name, nickname, phone,
                                    introduction, instagram, homepage, blog,
                                    profile.profilePath, profile.profileOrigin,
                                    portfolio.portfolioPath, portfolio.portfolioOrigin
                                FROM author AS a_c
                                    LEFT JOIN (
                                        SELECT
                                            id AS profile_id, file_transed_name AS profilePath, file_origin_name AS profileOrigin
                                        FROM files
                                    ) AS profile
                                    ON a_c.profile_file_id = profile.profile_id
                                    
                                    LEFT JOIN (
                                        SELECT
                                            id AS portfolio_id, file_transed_name AS portfolioPath, file_origin_name AS portfolioOrigin
                                        FROM files
                                    ) AS portfolio
                                    ON a_c.portfolio_file_id = portfolio.portfolio_id
                                WHERE is_deleted = 'N'
                            ) AS a
                            ON ail.author_id = a.a_id
                        ${commonQuery}
                        ORDER BY ail.registered_at DESC
                        ${param.page && param.per ? attachOffsetLimit(param.page, param.per) : ''}`

        const [res] = await conn.query(query)

        if (param.id && !res.length) throw new ConflictError('삭제되었거나 존재하지 않는 초대 내역입니다.')

        return { isLast: param.page * param.per >= total[0].cnt, totalCount: total[0].cnt, list: res }
    } catch (err) {
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[src/sql/figk/authorInviteLog/getAuthorInviteList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const updateAuthorApprove = async (param: AuthorApproveParamModel) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        await conn.beginTransaction()

        const query = `UPDATE 
                            author
                        SET
                            is_approve = '${param.isApprove}',
                            approver = ${param.approver},
                            approved_at = NOW()                            
                            ${param.isApprove === 'N' ? ` ,is_deleted = 'Y'` : `, group_id = ${param.groupId}`}
                        WHERE id = ${param.authorId}
                        `
        const [res] = await conn.query(query)

        if (!res.changedRows) throw new ConflictError('삭제된 작가이거나 존재하지 않는 작가입니다.')

        const logQuery = `UPDATE 
                            author_invite_log
                        SET
                            updated_at = NOW(),
                            ${param.isApprove === 'N' ? `author_id = NULL, ` : ``}
                            is_approve = '${param.isApprove}'
                        WHERE author_id = ${param.authorId}
                        `
        const [logRes] = await conn.query(logQuery)

        await conn.commit()
    } catch (err) {
        await conn.rollback()
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/authorInviteLog/updateAuthorApprove] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const deleteAuthorInviteLog = async (ids: Array<number>) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const [res] = await conn.query(`UPDATE 
                                            author_invite_log
                                        SET
                                            is_deleted = 'Y'
                                        WHERE id IN (${ids.join()})
                                        `)

        return res.affectedRows
    } catch (err) {
        throw new ServerError(`Error[src/sql/figk/authorInviteLog/deleteAuthorInviteLog] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getEmailWithAuthorInviteLog = async (inviteLogId: number) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        const [res] = await conn.query(`SELECT 
                                            email, code
                                        FROM author_invite_log
                                        WHERE id = ${inviteLogId}
                                        AND is_deleted = 'N'
                                        `)

        if (!res[0]) throw new ConflictError('삭제되었거나 존재하지 않는 초대 내역 id입니다.')
        return res[0]
    } catch (err) {
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[src/sql/figk/authorInviteLog/getEmailWithAuthorInviteLog] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
