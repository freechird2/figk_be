import { attachOffsetLimit } from 'function/shared'
import { BadRequestError, ConflictError, ServerError } from 'model/common/error'
import { CommonFigkParamModel } from 'model/figk/common'
import { noticeDataModel } from 'model/figk/notice'
import { crudLog } from 'sql/log/crudLog'
import db from '../../database'

// 공지사항 등록
export const createNotice = async (data: Partial<noticeDataModel>) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError(`db connection error`)

        const [result] = await conn.query(`INSERT INTO 
                                                notice(register, title, content)
                                            VALUES( ${data.userId},'${data.title}','${data.content}')`)

        if (!result.insertId) throw new ServerError()
        crudLog({ userId: Number(data.userId), userType: Number(data.userType), type: 'N', action: 'C' })
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        throw new ServerError(`Error[src/sql/figk/notice/createNotice] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// 공지사항 list/상세
export const getNoticeList = async (param: Partial<CommonFigkParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError(`db connection error`)

        if (param.id) {
            const [[isExist]] = await conn.query(
                `SELECT id 
                FROM notice
                WHERE is_deleted = 'N'
                AND id = ${param.id}
                `
            )
            if (!isExist) throw new ConflictError('조회할 수 없거나 존재하지 않는 공지사항 ID입니다.')
        }

        let commonWhere = ``

        if (param.isAdmin) {
            if (param.id) commonWhere = `AND n.id = ${param.id}`
            else
                commonWhere = `${param.startDate ? `AND n.updated_at  >= '${param.startDate}'` : ``}
                            ${param.endDate ? `AND n.updated_at < DATE_ADD ('${param.endDate}', INTERVAL 1 DAY)` : ``}
                ${
                    param.word
                        ? `AND (n.title LIKE '%${param.word}%'
                                OR admin.email LIKE '%${param.word}%'
                            )`
                        : ``
                }`
        } else {
            if (param.id) commonWhere = `AND n.id = ${param.id}`
            else
                commonWhere = `
                    ${param.startDate ? `AND n.registered_at >= '${param.startDate}'` : ``}
                    ${param.endDate ? `AND n.registered_at < DATE_ADD('${param.endDate}',INTERVAL 1 DAY)` : ``}
                    ${param.word ? `AND (n.title LIKE '%${param.word}%')` : ``}`
        }

        const [total] = await conn.query(
            `SELECT 
                COUNT(n.id) AS total
            FROM notice AS n
                LEFT JOIN admin ON n.register = admin.id
            WHERE n.is_deleted = 'N'
            ${commonWhere}`
        )

        const resQuery = `SELECT 
                            n.id,
                            n.title,
                            content,
                            ${
                                param.isAdmin
                                    ? `admin.email AS adminEmail,
                                        IF(n.registered_at IS NULL, '', 
                                        DATE_FORMAT(n.registered_at, '%y.%m.%d %H:%i')) AS registeredAt,
                                        IF(n.updated_at IS NULL, '', 
                                        DATE_FORMAT(n.updated_at, '%y.%m.%d %H:%i')) AS updatedAt
                                        `
                                    : `IF(n.updated_at IS NULL, DATE_FORMAT(n.registered_at, '%y.%m.%d %H:%i'), 
                                                                   DATE_FORMAT(n.updated_at, '%y.%m.%d %H:%i'))  AS registeredAt`
                            }
                        
                        FROM notice AS n
                            LEFT JOIN admin ON n.register = admin.id
                        WHERE n.is_deleted = 'N'
                        ${commonWhere}
                        ORDER BY ${
                            param.dateType
                                ? `${param.dateType === 'U' ? `n.updated_at` : `n.registered_at`}`
                                : `n.updated_at `
                        } DESC
                        ${attachOffsetLimit(param.page, param.per)}
                        `

        const [result] = await conn.query(resQuery)
        const isLast = param.page * param.per >= total[0].total
        return param.id ? result[0] || null : { isLast, totalCount: total[0].total, list: result }
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        throw new ServerError(`Error[src/sql/figk/notice/getNoticeList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// 공지사항 수정
export const updateNotice = async (data: noticeDataModel) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError(`db connection error`)

        const [isExist] = await conn.query(
            `SELECT 
                id 
            FROM notice
            WHERE id = ${data.id}
            AND is_deleted = 'N'
            `
        )

        if (!isExist.length) {
            throw new ConflictError('존재하지 않거나 삭제된 공지사항입니다.')
        }

        await conn.query(
            `UPDATE 
                notice
            SET 
                title = '${data.title}',
                content = '${data.content}',
                updated_at = NOW()
            WHERE id = ${data.id}`
        )

        crudLog({ userId: Number(data.userId), userType: Number(data.userType), type: 'N', action: 'U' })
    } catch (err) {
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        throw new ServerError(`Error[src/sql/figk/notice/updateNotice] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// 공지사항 삭제
export const deleteNotice = async (data: { ids: number[]; userId: number; userType: number }) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError(`db connection error`)

        const [isExist] = await conn.query(
            `SELECT  
                id
            FROM notice
            WHERE id IN (${data.ids.join()})
            AND is_deleted = 'N'
            `
        )

        if (isExist.length !== data.ids.length) {
            throw new ConflictError('삭제할 수 없는 공지사항 ID가 포함되어 있습니다.')
        }

        await conn.query(
            `UPDATE notice
            SET is_deleted = 'Y'
            WHERE id IN (${data.ids.join()})`
        )
        crudLog({ userId: Number(data.userId), userType: Number(data.userType), type: 'N', action: 'D' })
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[src/sql/figk/notice/deleteNotice] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
