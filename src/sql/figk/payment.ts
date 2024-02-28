import { attachOffsetLimit } from 'function/shared'
import { BadRequestError, ConflictError, ServerError } from 'model/common/error'
import { AuthorPayParamModel } from 'model/figk/authorPayParamModel'
import { CommonFigkParamModel } from 'model/figk/common'

import db from '../../database'

export const getPayListStudio = async (param: Partial<CommonFigkParamModel>) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        const commonWhere = `WHERE p.author_id = ${param.userId}
                            AND p.is_deleted = 'N'
                            ${param.startDate ? `AND p.completed_at >= '${param.startDate}'` : ``}               
                            ${param.endDate ? `AND p.completed_at < DATE_ADD ('${param.endDate}', INTERVAL 1 DAY)` : ``}`
        const [total] = await conn.query(
            `SELECT 
                COUNT(p.id) AS totalCount
                FROM payment AS p
                ${commonWhere}
            `
        )

        const summaryQuery = `SELECT 
                                SUM(amount) AS totalAmount,
                                SUM(CASE WHEN p.status = 'W' OR p.status = 'F' THEN amount END) AS waitingAmount,
                                SUM(CASE WHEN p.status = 'C' THEN amount END) AS completedAmount,
                                SUM(CASE WHEN pd.type = 'V' THEN amount END) AS votePay,
                                SUM(CASE WHEN pd.type = 'E' THEN amount END) AS applyPay,
                                SUM(CASE WHEN pd.type = 'P' THEN amount END) AS publishPay
                              
                            FROM payment_detail AS pd
                            LEFT JOIN payment AS p ON p.id = pd.payment_id
                            LEFT JOIN author AS a ON p.author_id = a.id
                            ${commonWhere}
                           `

        const [summary] = await conn.query(summaryQuery)

        const [res] = await conn.query(
            `SELECT 
                p.id, 
                p.status,
                week, 
                pd.type, 
                total_amount AS totalAmount,
                IF(p.completed_at IS NULL, '', DATE_FORMAT(p.completed_at, '%y.%m.%d %H:%i'))  AS completedAt
            FROM payment AS p
            LEFT JOIN payment_detail AS pd ON p.id = pd.payment_id
            ${commonWhere}
            GROUP BY p.id
            ORDER BY p.id DESC
            ${attachOffsetLimit(param.page, param.per)}`
        )

        return {
            totalCount: total[0].totalCount,
            isLast: param.page * param.per >= total[0].totalCount,
            summary: {
                totalPay: Number(summary[0].totalAmount) || 0,
                completedPay: Number(summary[0].completedAmount) || 0,
                waitingPay: Number(summary[0].waitingAmount) || 0,
                applyPay: Number(summary[0].applyPay) || 0,
                publishPay: Number(summary[0].publishPay) || 0,
                votePay: Number(summary[0].votePay) || 0,
            },
            list: res,
        }
    } catch (err) {
        throw new ServerError(`Error[src/sql/figk/payment/getPayListStudio] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

//  정산관리 list
//  ADMIN 작가 정산 내역 List
export const getPayListAdmin = async (param: Partial<AuthorPayParamModel>) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        // 작가명(필명), 상태별, 회차별, 정산완료일별
        const commonWhere = `${param.authorId ? `AND p.author_id = ${param.authorId}` : ``}
                            ${param.payStatus ? `AND p.status = '${param.payStatus}'` : ``}
                            ${param.week ? `AND p.week = ${param.week}` : ``}
                            ${
                                param.authorName
                                    ? `AND (a.name LIKE '%${param.authorName}%' OR a.nickname LIKE '%${param.authorName}%')`
                                    : ``
                            }
                            ${param.startDate ? `AND p.completed_at >= '${param.startDate}'` : ``}                                      
                            ${param.endDate ? `AND p.completed_at < DATE_ADD ('${param.endDate}', INTERVAL 1 DAY)` : ``}
                            `

        const [total] = await conn.query(
            `SELECT 
                COUNT(*) AS cnt
            FROM payment AS p
            LEFT JOIN author AS a ON p.author_id = a.id
            WHERE p.is_deleted = 'N'
            ${commonWhere}`
        )
        const summaryQuery = `SELECT 
                                SUM(amount) AS totalPay,
                                SUM(CASE WHEN p.status = 'W' THEN pd.amount END) AS waitingPay,
                                SUM(CASE WHEN p.status = 'C' THEN pd.amount END) AS completedPay,
                                SUM(CASE WHEN TYPE = 'V' THEN amount END) AS votePay,
                                SUM(CASE WHEN TYPE = 'E' THEN amount END) AS applyPay,
                                SUM(CASE WHEN TYPE = 'P' THEN amount END) AS publishPay
                            FROM payment_detail AS pd
                            LEFT JOIN payment AS p ON p.id = pd.payment_id
                            LEFT JOIN author AS a ON p.author_id = a.id
                            WHERE pd.is_deleted = 'N'    
                            ${commonWhere}`
        console.log(summaryQuery)

        const [paySummary] = await conn.query(summaryQuery)

        const query = `SELECT 
                            p.id,
                            p.week,
                            p.status AS payStatus,
                            a.name AS authorName,
                            IFNULL(a.nickname,'') AS nickname,
                            IFNULL(CONCAT(b.name,' ',account_number),'') AS accountInfo,
                            CONCAT(
                                '송고' ,' ',COUNT(CASE WHEN pd.type = 'E' THEN 1 END),' / ',
                                '투표' ,' ',COUNT(CASE WHEN pd.type = 'V' THEN 1 END),' / ',
                                '발행', ' ', COUNT(CASE WHEN pd.type = 'P' THEN 1 END)) AS history,
                            p.total_amount AS totalAmount,
                            IF(p.completed_at IS NULL, '', DATE_FORMAT(p.completed_at, '%y.%m.%d %H:%i')) AS completedAt
                        FROM payment AS p
                        LEFT JOIN payment_detail AS pd ON p.id = pd.payment_id
                        LEFT JOIN author AS a ON p.author_id = a.id
                        LEFT JOIN bank AS b ON b.code = a.bankcode
                            
                        WHERE p.id IS NOT NULL AND p.is_deleted = 'N'
                        GROUP BY p.id
                        ORDER BY p.id DESC
                        ${attachOffsetLimit(param.page, param.per)}
    
                        `

        // 총 정산금 + 검색 조건에 해당하는 로그인한 작가의 정산 list, 관리자라면 모든 정산 list retrun
        const [res] = await conn.query(query)

        return {
            summary: {
                totalPay: Number(paySummary[0].totalPay) || 0,
                completedPay: Number(paySummary[0].completedPay) || 0,
                waitingPay: Number(paySummary[0].waitingPay) || 0,
                applyPay: Number(paySummary[0].applyPay) || 0,
                publishPay: Number(paySummary[0].publishPay) || 0,
                votePay: Number(paySummary[0].votePay) || 0,
            },

            isLast: param.page * param.per >= total[0].cnt,
            totalCount: total[0].cnt,
            list: res,
        }
    } catch (err) {
        throw new ServerError(`Error[src/sql/figk/payment/getPayList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const paymentDetailAdmin = async (param: Partial<CommonFigkParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()
        if (!conn) {
            throw new ServerError('db connection error')
        }

        const [authorInfo] = await conn.query(
            `SELECT 
                a.id,
                week,
                a.is_editor AS isEditor,
                a.name,
                a.nickname,
                a.phone,
                p.status,
                IFNULL(g.groupName, '없음') AS groupName,
                a.email,
                CONCAT(b.name,' ',a.account_number) AS bankInfo,
                IFNULL(DATE_FORMAT(p.completed_at, '%y.%m.%d %H:%i'),'') AS completedAt
            FROM
                payment AS p
                LEFT JOIN author AS a ON a.id = p.author_id
                LEFT JOIN bank AS b ON a.bankcode = b.code
                LEFT JOIN (
                    SELECT
                        id AS g_id,
                        name AS groupName
                    FROM
                        author_group
                    WHERE
                        is_deleted = 'N') AS g ON a.group_id = g.g_id
            WHERE
                p.id = ${param.id}
                `
        )

        const [data] = await conn.query(
            `SELECT 
                pd.id, 
                payment_id AS paymentId,
                a.name AS authorName,
                IFNULL(ft.title,'') AS title,
                type, 
                amount,
                IFNULL(DATE_FORMAT(pd.registered_at, '%y.%m.%d %H:%i'),'') AS registeredAt
                FROM payment_detail AS pd
            LEFT JOIN author AS a ON pd.author_id = a.id
            LEFT JOIN figk_text AS ft ON ft.id = pd.text_figk_id
            WHERE payment_id = ${param.id}
            AND pd.is_deleted = 'N'`
        )
        return { authorInfo, list: data }
    } catch (err) {
        if (err instanceof BadRequestError) {
            throw new BadRequestError(err.message)
        } else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[src/sql/figk/payment/rejectPay] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const paymentDetailStudio = async (param: Partial<CommonFigkParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()
        if (!conn) {
            throw new ServerError('db connection error')
        }

        const [isExist] = await conn.query(
            `SELECT 
                COUNT(id) AS id
            FROM payment
            WHERE id = ${param.id}
            AND author_id = ${param.userId}
            AND is_deleted = 'N'
        `
        )

        if (!isExist[0].id) throw new ConflictError('존재하지 않거나 권한이 없습니다.')
        const [totalCount] = await conn.query(
            `SELECT 
                COUNT(pd.id) AS total
            FROM payment_detail AS pd 
            LEFT JOIN payment AS p ON pd.payment_id = p.id
            LEFT JOIN figk_text AS ft ON ft.id = pd.text_figk_id 
            WHERE pd.payment_id = ${param.id}`
        )

        const summaryQuery = `SELECT 
                                IFNULL(DATE_FORMAT(p.completed_at, '%y.%m.%d %H:%i'),'') AS completedAt,
                                p.week,
                                p.status,
                                total_amount AS totalPay, 
                                IFNULL(SUM(CASE WHEN TYPE = 'V' THEN amount END),0) AS votePay,
                                IFNULL(SUM(CASE WHEN TYPE = 'E' THEN amount END),0) AS applyPay,
                                IFNULL(SUM(CASE WHEN TYPE = 'P' THEN amount END),0) AS publishPay,
                                COUNT(CASE WHEN TYPE = 'V' THEN amount END) AS voteCount,
                                COUNT(CASE WHEN TYPE = 'E' THEN amount END) AS applyCount,
                                COUNT(CASE WHEN TYPE = 'P' THEN amount END) AS publishCount,
                                (SELECT pool_pay FROM config) AS voteAmount,
                                (SELECT apply_pay FROM config) AS applyAmount,
                                (SELECT publish_pay FROM config) AS publishAmount 
                            FROM payment AS p
                            LEFT JOIN payment_detail AS pd ON p.id = pd.payment_id
                            WHERE pd.is_deleted = 'N'    
                            AND p.author_id = ${param.userId}
                            AND p.id = ${param.id}
                           `
        const [summary] = await conn.query(summaryQuery)
        const query = `SELECT 
                            pd.id, 
                            type, 
                           IFNULL(CASE
                                WHEN 
                                    pd.type = 'V'
                                THEN
                                    ''
                                ELSE 
                                    ft.title
                            END,'') AS content,
                            amount 
                        FROM payment_detail AS pd 
                        LEFT JOIN payment AS p ON pd.payment_id = p.id
                        LEFT JOIN figk_text AS ft ON ft.id = pd.text_figk_id 
                        WHERE pd.payment_id = ${param.id}`

        const [res] = await conn.query(query)

        return {
            totalCount: totalCount[0].total,
            summary: {
                completedAt: summary[0].completedAt || '',
                week: summary[0].week,
                status: summary[0].status,
                totalPay: Number(summary[0].totalPay) || 0,
                voteCount: summary[0].voteCount,
                applyCount: summary[0].applyCount,
                publishCount: summary[0].publishCount,
                voteAmount: summary[0].voteAmount,
                applyAmount: summary[0].applyAmount,
                publishAmount: summary[0].publishAmount,
            },
            res,
        }
    } catch (err) {
        if (err instanceof BadRequestError) {
            throw new BadRequestError(err.message)
        } else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[src/sql/figk/payment/paymentDetailStudio] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
// 정산 취소
// export const cancelPay = async (data: { ids: number[]; note: string; userId: number }) => {
//     let conn = null

//     try {
//         conn = await db.getConnection()
//         if (!conn) {
//             throw new ServerError('db connection error')
//         }

//         const [isExist] = await conn.query(
//             `SELECT
//                 COUNT(pd.id) AS cnt,
//                 p.status
//             FROM payment_detail AS pd
//             LEFT JOIN payment AS p ON p.id = pd.payment_id
//             WHERE pd.id IN (${data.ids})
//             AND pd.is_deleted = 'N'
//             AND is_canceled = 'N'
//             AND p.status = 'W'
//             `
//         )

//         if (isExist[0].cnt !== data.ids.length) throw new ConflictError('취소할 수 없는 ID가 포함되어 있습니다.')

//         await conn.beginTransaction()
//         await conn.query(
//             `UPDATE
//                 payment_detail
//             SET
//                 is_canceled = 'Y',
//                 note = '${data.note}',
//                 canceled_by = ${data.userId},
//                 canceled_at = NOW()
//             WHERE id IN (${data.ids})`
//         )
//         await totalAmount(conn)

//         await conn.commit()
//     } catch (err) {
//         await conn.rollback()
//         if (err instanceof BadRequestError) {
//             throw new BadRequestError(err.message)
//         } else if (err instanceof ConflictError) throw new ConflictError(err.message)
//         else throw new ServerError(`Error[src/sql/figk/payment/cancelPay] : ${err}`)
//     } finally {
//         if (conn) await conn.release()
//     }
// }

export const transferLog = async (conn: any, authorAccount: any[], data: any[]) => {
    try {
        let query = ``
        for (let i = 0; i < data.length; i++) {
            query += `('${data[i].successYn}',
                        1,
                        '${data[i].replyMessage ?? ''}',
                        '${data[i].ori_seq_no ?? ''}',
                        '${data[i].balance ?? ''}',
                        ${authorAccount[i].id},
                        ${authorAccount[i].inBankCode ? `'${authorAccount[i].inBankCode}'` : `''`},
                        ${authorAccount[i].inAccount ? `'${authorAccount[i].inAccount}'` : `''`},
                        '${authorAccount[i].amount}',
                        (SELECT text_week FROM config) - 1
                        ),`
        }
        query = query.replace(/,\s*$/, '')
        const insertQuery = `INSERT INTO payment_log(is_success,
                                                    type,
                                                    reply_message,
                                                    ori_seq_no,
                                                    balance,
                                                    author_id,
                                                    bankcode,
                                                    account_number,
                                                    amount,
                                                    week)
                            VALUES ${query}`

        await conn.query(insertQuery)
    } catch (err) {
        if (err instanceof BadRequestError) {
            throw new BadRequestError(err.message)
        } else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[src/sql/figk/payment/transferLog] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const setPaymentStatus = async (conn: any, authorId: number, successYn: string) => {
    try {
        await conn.query(
            `UPDATE 
                payment
            SET
                status = ${
                    successYn === 'Y'
                        ? `'C',
                            completed_at = NOW()`
                        : `'F',
                            failed_at = NOW()`
                }
            WHERE author_id = ${authorId}`
        )
    } catch (err) {
        if (err instanceof BadRequestError) {
            throw new BadRequestError(err.message)
        } else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[src/sql/figk/payment/setPaymentStatus] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const insertPayment = async (conn: any, authorId: number, type: string, textFigkId?: number) => {
    try {
        const [isExist] = await conn.query(
            `SELECT 
                * 
            FROM payment 
            WHERE week = (SELECT text_week FROM config)
            AND author_id = ${authorId}`
        )

        if (!isExist.length) {
            const [paymentInsert] = await conn.query(
                `INSERT 
                    payment
                SET 
                    author_id = ${authorId},
                    total_amount = (SELECT ${type === 'E' ? `apply_pay` : `${type === 'V' ? `pool_pay` : `publish_pay`}`} FROM config),
                    week = (SELECT text_week FROM config)
                `
            )

            await conn.query(
                `INSERT 
                    payment_detail
                SET 
                    payment_id = ${paymentInsert.insertId},
                    author_id = ${authorId},
                    type = '${type}'
                    ${type === 'A' || type === 'P' ? `,text_figk_id = ${textFigkId}` : ``}

                    ,amount = (SELECT ${type === 'E' ? `apply_pay` : `${type === 'V' ? `pool_pay` : `publish_pay`}`} FROM config)
                    ${type === 'V' ? `` : `,text_figk_id = ${textFigkId}`}`
            )
        } else {
            await conn.query(
                `INSERT 
                    payment_detail
                SET 
                    payment_id = ${isExist[0].id},
                    author_id = ${authorId}, 
                    type = '${type}',
                    amount = (SELECT ${type === 'E' ? `apply_pay` : `${type === 'V' ? `pool_pay` : `publish_pay`}`} FROM config)
                    ${type === 'V' ? `` : `,text_figk_id = ${textFigkId}`}`
            )
        }
        await totalAmount(conn)
    } catch (err) {
        if (err instanceof BadRequestError) {
            throw new BadRequestError(err.message)
        } else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[src/sql/figk/payment/insertPayment] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const totalAmount = async (conn: any) => {
    try {
        await conn.query(`UPDATE    
                            payment AS p
                        SET total_amount = (SELECT 
                                                SUM(amount) AS amount 
                                            FROM payment_detail
                                            WHERE payment_id = p.id
                                            AND is_deleted = 'N'
                                            AND is_canceled = 'N' )
                                          
                        `)
    } catch (err) {
        if (err instanceof BadRequestError) {
            throw new BadRequestError(err.message)
        } else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[src/sql/figk/payment/totalAmount] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
