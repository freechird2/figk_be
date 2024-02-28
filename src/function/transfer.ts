import { BadRequestError, ConflictError, ServerError } from 'model/common/error'
import fetch from 'node-fetch'
import { getAuthorAccount } from 'sql/figk/author'
import { setPaymentStatus, transferLog } from 'sql/figk/payment'
import db from '../database'

export const transfer = async () => {
    const logData = []
    let conn = null

    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        const authorAccount = await getAuthorAccount(conn)

        await conn.beginTransaction()

        for (const data of authorAccount) {
            // 6자리 난수 생성
            const createSeqNo = () => {
                const length = 6
                const hashCode = process.env.TRANSFER_HASH_CODE
                return Array.from({ length }, () => hashCode[Math.floor(Math.random() * hashCode.length)]).join('')
            }

            const body = {
                ekey: process.env.E_KEY,
                msalt: process.env.MSALT,
                kscode: process.env.KSCODE,
                compCode: process.env.COMP_CODE,
                bankCode: process.env.OUT_BANK_CODE,
                outAccount: process.env.OUT_ACCOUNT_PROD,
                seqNo: createSeqNo(),
                amount: data.amount,
                inBankCode: data.inBankCode,
                inAccount: data.inAccount,
                inPrintContent: data.name,
            }

            // 실제 송금 API
            const response = await fetch(process.env.TRANSFER_URI, {
                method: 'post',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': process.env.USER_ID,
                    Hkey: process.env.H_KEY,
                },
            })

            const result = await response.json()
            logData.push(result)
            if (result.successYn === 'N') throw new BadRequestError(result.replyMessage)
            await setPaymentStatus(conn, data.id, result.successYn)
        }
        if (authorAccount.length) await transferLog(conn, authorAccount, logData)
        await conn.commit()
    } catch (err) {
        if (err instanceof BadRequestError) throw new BadRequestError(err.message)
        else if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[function/transfer/transfer] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
