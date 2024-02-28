import { createMailForm } from 'function/mailForm'
import { sendMail } from 'function/shared'
import { MailFormModel } from 'model/common/common'
import { ServerError } from 'model/common/error'
import { SendMailOptions } from 'nodemailer'
import { logger } from '../../../config/logger'
import db from '../../database'

export const updateProcessStatus = async (status: string) => {
    let conn = null

    const stat =
        status === 'A'
            ? '지원 가능'
            : status === 'V'
            ? '투표 중'
            : status === 'P'
            ? '투표 중지'
            : status === 'T'
            ? '송고 심사'
            : '투표 마감'
    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'
        await conn.beginTransaction()
        const [res] = await conn.query(
            `UPDATE 
                config 
            SET process_status = '${status}'`
        )

        // 투표 시작 시 송고심사에서 반려된 핔커들에게 메일을 보낸다
        if (status === 'V') {
            const [[config]] = await conn.query(`SELECT text_week FROM config`)

            const turnDownQuery = `SELECT 
                                    a.name, a.email
                                FROM figk_text AS ft
                                    LEFT JOIN (
                                        SELECT
                                            id AS a_id, name, email
                                        FROM author
                                    ) AS a
                                    ON ft.author_id = a.a_id
                                WHERE
                                    ft.is_deleted = 'N'
                                    AND ft.status = 'T'
                                    AND ft.week = ${config.text_week}
                                GROUP BY ft.author_id`

            const [turnDownList] = await conn.query(turnDownQuery)

            turnDownList.map((t) => {
                if (t.email && t.name) {
                    const mailParam: MailFormModel = {
                        type: 'rejectText',
                    }

                    const mailOption: SendMailOptions = {
                        from: '"FIGK" <figk@fig.xyz>', //your or my Email(발송자)
                        to: t.email, //your or my Email(수신자)
                        subject: `[FIGK] ${t.name}님이 Vol.${String(config.text_week).padStart(
                            3,
                            '0'
                        )}에 송고한 글이 반려되었습니다.`, // title  (발송 메일 제목)
                        text: '메세지', // plain text (발송 메일 내용)
                        html: createMailForm(mailParam), // HTML Content (발송 메일 HTML컨텐츠)
                    }
                    sendMail(mailOption)
                }
            })
        }

        // 투표 마감 시 figk_text의 이번 주, 지원 상태인 글들을 투표 완료("C")상태로 변경
        if (status === 'C') {
            await conn.query(
                `UPDATE 
                    figk_text 
                SET status = 'C' 
                WHERE week = (SELECT text_week FROM config) 
                AND status = 'E'`
            )
        }
        if (res.affectedRows) {
            logger.verbose(`Process Status : ${stat}`)
        }

        await conn.commit()
    } catch (err) {
        logger.error(`[ERROR] Process Status : ${stat}`)
        await conn.rollback()
        throw new ServerError(`Error[src/sql/figk/config/updateProcessStatus] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
