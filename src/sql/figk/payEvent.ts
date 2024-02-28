import { BadRequestError, ConflictError, ServerError } from 'model/common/error'
import db from '../../database'
import { insertPayment } from './payment'

export const payEvent = async (status: string) => {
    let conn = null

    try {
        conn = await db.getConnection()
        const [getConfig] = await conn.query(
            `SELECT 
                text_week,
                pool_pay,
                publish_pay, 
                apply_pay 
            FROM config`
        )

        await conn.beginTransaction()
        if (status === 'V') {
            const [getAuthor] = await conn.query(
                `SELECT 
                    author_id 
                FROM vote 
                WHERE week = ${getConfig[0].text_week} 
                AND admin_id IS NULL`
            )

            const votedAuthor = getAuthor.map((v: { author_id: number }) => v.author_id)
            votedAuthor.forEach((authorId: number) => {
                insertPayment(conn, authorId, 'V')
            })

            await conn.commit()
        } else if (status === 'A') {
            const [applyFigk] = await conn.query(
                `SELECT 
                    author_id,
                    id
                FROM figk_text
                WHERE week = (SELECT text_week FROM config)
                AND status = 'E'
                `
            )
            for (const i of applyFigk) {
                await insertPayment(conn, i.author_id, 'E', i.id)
            }
        } else if (status === 'P') {
            const [publishFigk] = await conn.query(
                `SELECT 
                    id,author_id 
                FROM figk_text 
                WHERE is_published = 'Y' 
                AND week = ${getConfig[0].text_week}`
            )

            for (const i of publishFigk) {
                await insertPayment(conn, i.author_id, 'P', i.id)
            }
        }
        await conn.commit()
    } catch (err) {
        await conn.rollback()
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/payEvent/payEvent] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
