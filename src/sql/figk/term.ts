import { attachOffsetLimit } from 'function/shared'
import { BadRequestError, ConflictError, ServerError } from 'model/common/error'
import { CommonFigkParamModel } from 'model/figk/common'
import { TermsDataModel } from 'model/figk/termDataModel'
import { TermParamModel } from 'model/figk/termParamModel'
import { crudLog } from 'sql/log/crudLog'
import db from '../../database'

// 약관 list,상세
export const getTermListDetail = async (param: Partial<TermParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        if (param.id) {
            const [[isExist]] = await conn.query(
                `SELECT 
                    id 
                FROM term 
                WHERE id = ${param.id} 
                AND is_deleted = 'N' 
                `
            )

            if (!isExist) throw new ConflictError('조회할 수 없는 약관입니다.')
        }

        const commonWhere = `${
            param.id ? `AND t.id = ${param.id}` : `${param.termType ? `AND t.type = ${param.termType}` : ``}`
        }`

        const [[total]] = await conn.query(
            `SELECT 
                COUNT(id) AS total
            FROM term AS t
            WHERE is_deleted = 'N'
            ${commonWhere}
            `
        )

        const [list] = await conn.query(
            `SELECT 
                t.id,
                version,
                t.type,
                a.name AS register,
               IF(t.registered_at IS NULL, '', DATE_FORMAT(t.registered_at, '%y.%m.%d %H:%i')) AS registeredAt
               ${
                   param.id
                       ? `,content, 
                            IF(t.updated_at IS NULL, '', DATE_FORMAT(t.updated_at, '%y.%m.%d %H:%i')) AS updatedAt`
                       : ``
               }
            FROM term AS t
                LEFT JOIN admin AS a ON t.register = a.id
            WHERE t.is_deleted = 'N'
            ${commonWhere}
            ORDER BY is_active = 'Y' DESC, t.type ASC
            ${param.page ? `${attachOffsetLimit(param.page, param.per)}` : ``}`
        )

        return { isLast: param.page * param.per >= total.total, totalCount: total.total, list }
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/term/getTermsListDetail] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// 약관 등록
export const createTerm = async (data: Partial<TermsDataModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        // 해당 타입의 가장 최근 버전 가져옴
        const [[getVersion]] = await conn.query(
            `SELECT version FROM term WHERE type = ${data.termType} AND is_deleted = 'N' ORDER BY id DESC`
        )
        await conn.beginTransaction()
        // 가장 최근 버전 +1 하면서 인서트
        const insertTerm = await conn.query(
            `INSERT INTO term(content, type,version, register, registered_at)
            VALUES('${data.content}',
                    ${data.termType}, 
                    ${getVersion ? getVersion.version + 1 : 1},
                    ${data.userId} ,NOW())`
        )

        const [[getType]] = await conn.query(`SELECT type FROM term WHERE id = ${insertTerm[0].insertId}`)

        await conn.query(
            `UPDATE 
                term
            SET is_active = CASE 
                                WHEN id = ${insertTerm[0].insertId} 
                                THEN 'Y' ELSE 'N' 
                            END,
                updated_at = NOW()
            WHERE type = ${getType.type}`
        )
        await conn.commit()
        crudLog({ userId: Number(data.userId), userType: Number(data.userType), type: 'C', action: 'C' })
    } catch (err) {
        await conn.rollback()
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/term/createTerm] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// 약관 수정
export const updateTerm = async (data: { content: string; id: number; userId: number; userType: number }) => {
    let conn = null

    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')
        const [isExist] = await conn.query(
            `SELECT 
                id 
            FROM term 
            WHERE id = ${data.id}
            AND is_deleted = 'N'`
        )

        if (!isExist.length) {
            throw new ConflictError('존재하지 않거나 삭제된 약관입니다.')
        }
        const [getTypes] = await conn.query(`SELECT type FROM term WHERE id = ${data.id}`)
        await conn.beginTransaction()

        await conn.query(
            `UPDATE 
                term
            SET content = '${data.content}',
               is_active = 'Y',                           
                updated_at = NOW()
            WHERE id = ${data.id}`
        )

        await conn.query(
            `UPDATE term 
            SET is_active = 'N'
            WHERE id != ${data.id}
            AND type = ${getTypes[0].type}`
        )
        await conn.commit()

        crudLog({ userId: Number(data.userId), userType: Number(data.userType), type: 'C', action: 'U' })
    } catch (err) {
        await conn.rollback()
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/term/updateTerm] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// 약관 삭제
export const deleteTerm = async (data: { ids: number[]; userId: number; userType: number }) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        const [isExist] = await conn.query(
            `SELECT 
                id 
            FROM term 
            WHERE id IN (${data.ids.join()})
            AND is_deleted = 'N'
            AND is_active = 'N'`
        )

        if (isExist.length !== data.ids.length) {
            throw new ConflictError('존재하지 않거나 삭제할 수 없는 약관입니다.')
        }

        await conn.query(
            `UPDATE 
                term 
            SET 
                is_deleted = 'Y'
            WHERE id IN (${data.ids.join()})`
        )
        crudLog({ userId: Number(data.userId), userType: Number(data.userType), type: 'C', action: 'D' })
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/term/deleteTerm] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// 약관 list,상세
export const getAuthorTermDetail = async (param: Partial<CommonFigkParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        const query = `SELECT 
                            id, version, content, type,
                            a.name AS register,
                            DATE_FORMAT(registered_at, '%y.%m.%d %H:%i') AS registeredAt
                        FROM term AS t
                            LEFT JOIN (
                                SELECT
                                    id AS a_id, name
                                FROM admin
                            ) AS a
                            ON t.register = a.a_id
                        WHERE is_deleted = 'N'
                        AND type = ${param.termType}
                        AND is_active = 'Y'
                        ORDER BY t.version DESC
                    `
        const [[res]] = await conn.query(query)

        if (!res) throw new ConflictError('조회된 약관이 없습니다.')

        const data = {
            detail: res,
        }

        return data
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/term/getAuthorTermDetail] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// 약관 버전 list
export const getAuthorTermVersion = async (param: Partial<CommonFigkParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        const query = `SELECT 
                        id, DATE_FORMAT(registered_at, '%y.%m.%d ver') AS version
                    FROM term
                    WHERE type = ${param.termType}
                    AND is_deleted = 'N'
                  
                    ORDER BY version DESC
                    `
        const [res] = await conn.query(query)

        return res
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/term/getAuthorTermVersion] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
