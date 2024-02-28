import { createMailForm } from 'function/mailForm'
import { attachOffsetLimit, createCrytoPassword, sendMail } from 'function/shared'
import { MailFormModel } from 'model/common/common'
import { ConflictError, ServerError, UnauthorizedError } from 'model/common/error'
import { AuthorChangeInfoParamModel } from 'model/figk/authorChangeInfoParamModel'
import { AuthorChangeStatusParamModel } from 'model/figk/authorChangeStatusParamModel'
import { AuthorCreateDataModel } from 'model/figk/authorCreateDataModel'
import { AuthorFindPasswordModel } from 'model/figk/authorFindPwModel'
import { AuthorProfileModel } from 'model/figk/authorProfile'
import { CommonFigkParamModel } from 'model/figk/common'
import { RequestAuthorAccountInfoModel, RequestAuthorJoinModel } from 'model/user/user'
import fetch from 'node-fetch'
import { SendMailOptions } from 'nodemailer'
import { crudLog } from 'sql/log/crudLog'
import db from '../../database'

export const getAuthorDetail = async (param: Partial<CommonFigkParamModel>) => {
    let result = null
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)
        const query = `SELECT 
                            id, 
                            IF(nickname IS NULL OR nickname = '', name, nickname) AS nickname,
                            IFNULL(instagram, '') AS instagram, 
                            IFNULL(homepage, '') AS homepage, IFNULL(blog, '') AS blog,
                            IFNULL(introduction, '') AS introduction,
                            ${
                                param.isDetail
                                    ? ``
                                    : `
                                        name, email, phone,
                                        IFNULL(contact_email, '') AS contactEmail,
                                        a.group_id AS groupId,
                                        IFNULL(g.groupName, '') AS groupName, 
                                        is_approve AS isApprove,
                                        status,
                                        is_temp_password AS isTempPassword,
                                        is_editor AS isEditor, bankcode, b.bankName, account_number AS accountNumber,
                                        (
                                            SELECT
                                                process_status
                                            FROM config
                                        ) AS processStatus,
                                        (
                                            SELECT
                                                text_week
                                            FROM config
                                        ) AS textFigkWeek,
                                        (
                                            SELECT
                                                ag.name
                                            FROM config AS c
                                                LEFT JOIN author_group AS ag ON c.current_group_id = ag.id
                                        ) AS currentGroup,
                                    `
                            }
                            ${
                                param.isAdmin
                                    ? `
                                    IFNULL(fi.file_transed_name, '') AS idCardUrl,
                                    IFNULL(fb.file_transed_name, '') AS bankbookUrl,
                                `
                                    : ``
                            }
                            (SELECT is_pause FROM config) AS isPause
                        FROM author AS a
                            LEFT JOIN (
                                SELECT
                                    id AS g_id, name AS groupName
                                FROM author_group
                                WHERE is_deleted = 'N'
                            ) AS g
                            ON a.group_id = g.g_id

                            LEFT JOIN (
                            	SELECT
                            		id AS b_id, name AS bankName
                            	FROM bank
                            ) AS b
                            ON a.bankcode = b.b_id

                            LEFT JOIN (
                                SELECT
                                    id AS f_id, file_transed_name
                                FROM files
                            ) AS fi
                            ON a.id_card_file_id = fi.f_id
    
                            LEFT JOIN (
                                SELECT
                                    id AS f_id, file_transed_name
                                FROM files
                            ) AS fb
                            ON a.bankbook_file_id = fb.f_id
                        WHERE id = ${param.isAdmin ? param.id : param.authorId ?? param.userId}
                        AND is_deleted = 'N'
                        `

        let [res] = await conn.query(query)
        if (param.isDetail === 'N') {
            crudLog({ userId: Number(param.userId), userType: Number(param.userType), type: 'U', action: 'R' })
        }

        result = res[0] || null
    } catch (err) {
        throw new ServerError(`Error[sql/figk/author/getAuthorDetail] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

export const registAuthor = async (data: RequestAuthorJoinModel) => {
    let result = -1
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        const query = /* sql */ `
                        INSERT  
                            author
                        SET
                            name = '${data.name}',
                            nickname = ${data.nickname ? `'${data.nickname}'` : `'${data.name}'`},
                            email = '${data.email}',
                            phone = '${data.phone}',
                            password = '${data.password}',
                            ${data.instagram ? `instagram = '${data.instagram}', ` : ``}
                            ${data.blog ? `blog = '${data.blog}', ` : ``}
                            ${data.homepage ? `homepage = '${data.homepage}', ` : ``}
                            ${data.introduction ? `introduction = '${data.introduction}', ` : ``}
                            bankcode = ${data.bankcode},
                            account_type = ${data.accountType},
                            account_number = '${data.accountNumber}',
                            registration_num = '${data.registrationNum}',
                            agree_terms = '${data.agreeTerms}',
                            agree_copyright = '${data.agreeCopyright}',
                            agree_personal_info = '${data.agreePersonalInfo}',
                            agree_marketing = '${data.agreeMarketing}',
                            id_card_file_id = ${data.idCard},
                            bankbook_file_id = ${data.bankbook},
                            registered_at = NOW()
                        `
        let [res] = await conn.query(query)

        result = res.affectedRows

        // 회원가입 후 초대 내역에 author_id 연결
        await conn.query(`UPDATE
                            author_invite_log
                        SET
                            author_id = ${res.insertId},
                            is_approve = 'W'
                        WHERE email = '${data.email}'
                        AND is_approve = 'I'
                        `)
    } catch (err) {
        throw new ServerError(`Error[sql/figk/author/registAuthor] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

export const deleteAuthor = async (authorId: number) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        const [res] = await conn.query(`UPDATE 
                            author
                        SET
                            is_deleted = 'Y'
                        WHERE id = ${authorId}
                        `)

        return res.changedRows
    } catch (err) {
        throw new ServerError(`Error[sql/figk/author/deleteAuthor] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const checkAuthorPhone = async (data: Partial<AuthorProfileModel>) => {
    let result = false
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        const query = `
                        SELECT
                            COUNT(id) AS cnt
                        FROM author
                        WHERE is_deleted = 'N'
                        AND phone = '${data.phone}'
                        ${data.id ? ` AND id != ${data.id}` : ``}
                        `

        let [res] = await conn.query(query)

        result = res[0].cnt > 0 ? false : true
    } catch (err) {
        throw new ServerError(`Error[sql/figk/author/checkAuthorPhone] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

export const checkAuthorEmail = async (data: Partial<AuthorProfileModel>) => {
    let result = false
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        const query = `SELECT 
                            COUNT(id) AS cnt
                        FROM author
                        WHERE is_deleted = 'N'
                        AND email = '${data.email}'
                        ${data.id ? ` AND id != ${data.id}` : ``}
                        `

        let [res] = await conn.query(query)

        result = res[0].cnt > 0 ? false : true
    } catch (err) {
        throw new ServerError(`Error[sql/figk/author/checkAuthorEmail] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

export const checkAuthorNickname = async (data: Partial<AuthorProfileModel>) => {
    let result = false
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        const query = `
                        SELECT
                            COUNT(id) AS cnt
                        FROM author
                        WHERE is_deleted = 'N'
                        AND nickname = '${data.nickname}'
                        ${data.id ? ` AND id != ${data.id}` : ``}
                        `

        let [res] = await conn.query(query)

        result = res[0].cnt > 0 ? false : true
    } catch (err) {
        throw new ServerError(`Error[sql/figk/author/checkAuthorNickname] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

export const updateAuthorProfile = async (profile: AuthorProfileModel) => {
    let result = false
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        const query = `
                        UPDATE
                            author
                        SET
                            phone = '${profile.phone}',
                            name = '${profile.name}',
                            nickname = ${profile.nickname ? `'${profile.nickname}'` : `'${profile.name}'`},
                            instagram = ${profile.instagram ? `'${profile.instagram}'` : `NULL`},
                            homepage = ${profile.homepage ? `'${profile.homepage}'` : `NULL`},
                            blog = ${profile.blog ? `'${profile.blog}'` : `NULL`},
                            contact_email = ${profile.contactEmail ? `'${profile.contactEmail}'` : `NULL`},
                            introduction = ${profile.introduction ? `'${profile.introduction}'` : `NULL`}
                        WHERE id = ${profile.id}
                        `

        let [res] = await conn.query(query)

        result = res.affectedRows > 0 ? true : false
    } catch (err) {
        throw new ServerError(`Error[sql/figk/author/updateAuthorProfile] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

export const updateAuthorPassword = async (profile: Pick<AuthorProfileModel, 'id' | 'newPassword' | 'password'>) => {
    let result = false
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        const [validRes] = await conn.query(
            `SELECT COUNT(*) AS cnt FROM author WHERE id = ${profile.id} AND password = '${profile.password}'`
        )

        if (validRes[0].cnt < 1) throw new UnauthorizedError('비밀번호를 다시 확인해주세요.')

        const query = `
                        UPDATE
                            author
                        SET
                            password = '${profile.newPassword}',
                            is_temp_password = 'N'
                        WHERE id = ${profile.id}
                        `

        let [res] = await conn.query(query)

        result = res.affectedRows > 0 ? true : false
    } catch (err) {
        if (err instanceof UnauthorizedError) throw new UnauthorizedError(err.message)
        throw new ServerError(`Error[sql/figk/author/updateAuthorPassword] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

export const getAuthorList = async (filter: Partial<CommonFigkParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        const commonWhere = `
                            ${
                                filter.word
                                    ? `AND 
                                        (
                                            a.name LIKE '%${filter.word}%'
                                            OR a.nickname LIKE '%${filter.word}%'
                                            OR a.email LIKE '%${filter.word}%'
                                            OR a.phone LIKE '%${filter.word}%'
                                        )`
                                    : ``
                            }
                            ${filter.groupId ? ` AND a.group_id = ${filter.groupId}` : ``}
                            ${filter.isActive ? ` AND a.status = '${filter.isActive}'` : ``}
                            ${filter.startDate ? ` AND a.registered_at >= '${filter.startDate}'` : ``}
                            ${filter.endDate ? ` AND a.registered_at < DATE_ADD('${filter.endDate}', INTERVAL 1 DAY)` : ``}
                            `

        const totalQuery = `SELECT 
                                COUNT(id) AS cnt
                            FROM author AS a
                                LEFT JOIN (
                                    SELECT
                                        id AS g_id, name AS groupName
                                    FROM author_group
                                    WHERE is_deleted = 'N'
                                ) AS g
                                ON a.group_id = g.g_id
                            WHERE is_deleted = 'N'
                            ${commonWhere}
                            `
        const [totalCount] = await conn.query(totalQuery)

        const query = `SELECT 
                        id, status,
                        CASE
                            WHEN status = 'Y' THEN '활성'
                            WHEN status = 'N' THEN '비활성'
                        END AS statusTxt,
                        IFNULL(g.groupName, '없음') AS groupName,
                        email, name, 
                        IFNULL(nickname, name) AS nickname, 
                        IFNULL(phone, '') AS phone,
                        DATE_FORMAT(registered_at, '%y.%m.%d %H:%i') AS registeredAt
                    FROM author AS a
                        LEFT JOIN (
                            SELECT
                                id AS g_id, name AS groupName
                            FROM author_group
                            WHERE is_deleted = 'N'
                        ) AS g
                        ON a.group_id = g.g_id

                        
                    WHERE is_deleted = 'N'
                    ${commonWhere}
                    ORDER BY a.registered_at DESC
                    ${filter.page && filter.per ? `${attachOffsetLimit(filter.page, filter.per)}` : ``}
                    `

        const [res] = await conn.query(query)

        crudLog({ userId: Number(filter.userId), userType: Number(filter.userType), type: 'U', action: 'R' })

        return { isLast: filter.page * filter.per >= totalCount[0].cnt, totalCount: totalCount[0].cnt, list: res }
    } catch (err) {
        throw new ServerError(`Error[sql/figk/author/getAuthorList] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const sendTempPassword = async (data: AuthorFindPasswordModel) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        await conn.beginTransaction()

        const findQuery = `SELECT 
                                id, name
                            FROM author
                            WHERE is_deleted = 'N'
                            AND email = '${data.email}'
                            AND name = '${data.name}'
                            AND phone = '${data.phone}'`

        const [findRes] = await conn.query(findQuery)

        if (!findRes[0] || findRes[0].id < 1) return false

        const tempPw = Math.random().toString(36).slice(2, 10)

        const mailParam: MailFormModel = {
            type: 'changePassword',
            tempPw: tempPw,
        }

        const mailOption: SendMailOptions = {
            from: '"FIGK" <figk@fig.xyz>', //your or my Email(발송자)
            to: data.email, //your or my Email(수신자)
            subject: `[FIGK] ${findRes[0].name}님께 임시 비밀번호가 발급되었어요.`, // title  (발송 메일 제목)
            text: '메세지', // plain text (발송 메일 내용)
            html: createMailForm(mailParam), // HTML Content (발송 메일 HTML컨텐츠)
        }

        await sendMail(mailOption)

        const [res] = await conn.query(`UPDATE 
                                            author
                                        SET
                                            password = '${createCrytoPassword(tempPw)}',
                                            is_temp_password = 'Y'
                                        WHERE id = ${findRes[0].id}`)

        if (res.affectedRows) {
            await conn.commit()
        } else {
            throw new ServerError()
        }
    } catch (err) {
        await conn.rollback()
        throw new ServerError(`Error[sql/figk/author/sendTempPassword] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return true
}

export const createAuthor = async (data: AuthorCreateDataModel) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        const code = createCrytoPassword(data.email)
        const query = `INSERT 
                            author
                        SET
                            email = '${data.email}',
                            phone = '${data.phone}',
                            is_editor = '${data.isEditor}',
                            code= '${code}',
                            name = '${data.name}',
                            nickname = '${data.nickname ? `${data.nickname}` : `${data.name}`}',
                            bankcode = ${data.bankId},
                            account_number = '${data.accountNumber}',
                            ${data.instagram ? `instagram = '${data.instagram}',` : ``}
                            ${data.homepage ? `homepage = '${data.homepage}',` : ``}
                            ${data.blog ? `blog = '${data.blog}',` : ``}
                            ${data.contactEmail ? `contact_email = '${data.contactEmail}',` : ``}
                            ${data.introduction ? `introduction = '${data.introduction}',` : ''}
                            group_id = ${data.groupId},
                            is_approve = 'Y',
                            approver = ${data.approver},
                            approved_at = NOW()
                        `

        const [res] = await conn.query(query)

        if (!res.insertId) throw 'Create Author Error'

        const mailOption: SendMailOptions = {
            from: '"FIGK" <figk@fig.xyz>', //your or my Email(발송자)
            to: data.email, //your or my Email(수신자)
            subject: `[FIGK] 가입 안내 메일`, // title  (발송 메일 제목)
            text: '메세지', // plain text (발송 메일 내용)
            html: `<div>
                    <div>축하합니다.</div>
                    <a href="${`http://localhost:3000/form/terms?em=${code}`}">
                        가입완료하기
                    </a>
                </div>`, // HTML Content (발송 메일 HTML컨텐츠)
        }

        await sendMail(mailOption)

        return res.insertId
    } catch (err) {
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/author/createAuthor] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const updateAuthorInfo = async (param: AuthorChangeInfoParamModel) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        const [group] = await conn.query(`SELECT 
                                            COUNT(id) AS cnt
                                        FROM author_group
                                        WHERE is_deleted = 'N'
                                        AND id = ${param.groupId}
                                        `)

        if (group[0].cnt < 1) throw new ConflictError('이미 삭제되었거나 존재하지 않는 group id입니다.')

        const [res] = await conn.query(`UPDATE 
                                            author
                                        SET
                                            group_id = ${param.groupId}
                                        WHERE is_deleted = 'N'
                                        AND id = ${param.authorId}
                                        `)

        return res.affectedRows
    } catch (err) {
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/author/updateAuthorInfo] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const updateAuthorStatus = async (param: AuthorChangeStatusParamModel) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        const [res] = await conn.query(`UPDATE 
                                            author
                                        SET
                                            status = '${param.status}'
                                        WHERE is_deleted = 'N'
                                        AND id = ${param.authorId}
                                        `)

        if (param.status === 'N') {
            const [[author]] = await conn.query(`SELECT name, email FROM author WHERE id = ${param.authorId}`)

            if (author.email) {
                const mailParam: MailFormModel = {
                    type: 'inactiveAccount',
                    email: author.email,
                }

                const mailOption: SendMailOptions = {
                    from: '"FIGK" <figk@fig.xyz>', //your or my Email(발송자)
                    to: author.email, //your or my Email(수신자)
                    subject: `[FIGK] ${author.name}님의 FIGK ID가 비활성화되었습니다.`, // title  (발송 메일 제목)
                    text: '메세지', // plain text (발송 메일 내용)
                    html: createMailForm(mailParam), // HTML Content (발송 메일 HTML컨텐츠)
                }
                sendMail(mailOption)
            }
        }

        return res.affectedRows
    } catch (err) {
        throw new ServerError(`Error[sql/figk/author/updateAuthorStatus] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getAuthorSearchName = async (param: Partial<CommonFigkParamModel>) => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw new ServerError(`db connection error`)

        const [res] = await conn.query(`SELECT 
                                            id, email, name,
                                            IFNULL(nickname, name) AS nickname, IFNULL(phone, '') AS phone
                                        FROM author
                                        WHERE is_deleted = 'N'
                                        ${param.email ? ` AND email LIKE '%${param.email}%'` : ``}
                                        ${param.name ? ` AND name LIKE '%${param.name}%'` : ``}
                                        ${param.nickname ? ` AND nickname LIKE '%${param.nickname}%'` : ``}
                                        ${param.phone ? ` AND phone LIKE '%${param.phone}%'` : ``}
                                        ORDER BY name ASC, email ASC
                                    `)

        return res
    } catch (err) {
        throw new ServerError(`Error[sql/figk/author/getAuthorSearchName] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getActivatedTerms = async () => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        const [list] = await conn.query(
            `SELECT 
                id,
                content, 
                type
            FROM term 
            WHERE is_active = 'Y'
            AND is_deleted = 'N'
            ORDER BY type`
        )
        return list
    } catch (err) {
        throw new ServerError(`Error[sql/figk/author/getActivatedTerms] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// 계좌 정보 등록(임시)
export const updateAccountInfo = async (data: RequestAuthorAccountInfoModel) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        const [getBankId] = await conn.query(
            `SELECT 
                id 
            FROM bank 
            WHERE id = ${data.bankcode}`
        )
        if (!getBankId[0]) throw new ConflictError('존재하지 않는 은행입니다.')

        await conn.query(
            `UPDATE 
                author 
            SET 
                bankcode = ${data.bankcode},
                account_type = ${data.accountType},
                account_number = '${data.accountNumber}',
                registration_num = '${data.registrationNum}',
                id_card_file_id = ${data.idCard},
                bankbook_file_id = ${data.bankbook}
            WHERE id = ${data.userId}`
        )
    } catch (err) {
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        throw new ServerError(`Error[sql/figk/author/updateAccountInfo] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

// 작가 계좌 정보 가져오기
export const getAuthorAccount = async (conn: any) => {
    try {
        // 정산정보
        const [getPayment] = await conn.query(
            `SELECT 
                total_amount AS amount,
                author_id,
                a.name                
            FROM payment AS p
            LEFT JOIN author AS a ON a.id = p.author_id
            WHERE p.status = 'W'
            AND p.is_deleted = 'N'
            `
        )
        if (!getPayment.length) throw new ConflictError('정산 처리할 작가가 없습니다.')
        const authorIds = getPayment.map((v: { author_id: number }) => v.author_id)

        // // 계좌 정보
        const [authorAccInfo] = await conn.query(
            `SELECT 
               id, 
               bankcode AS inBankCode,
               account_number AS inAccount
            FROM author
            WHERE id IN (${authorIds})
          `
        )

        const res = []
        for (let i = 0; i < Math.min(authorAccInfo.length, getPayment.length); i++) {
            res.push({
                ...authorAccInfo[i],
                ...getPayment[i],
            })
        }

        return res
    } catch (err) {
        await conn.rollback()
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        throw new ServerError(`Error[sql/figk/author/getAuthorAccount] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const getInviteAuthorByCode = async (code: string) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')

        const query = /* sql */ `
                        SELECT
                            id, email
                        FROM author_invite_log
                        WHERE is_deleted = 'N'
                        AND code = '${code}'
                        AND is_approve = 'I'
                        `

        const [[author]] = await conn.query(query)

        if (!author || !author.id) throw new ConflictError('잘못된 작가 코드입니다.')

        return author
    } catch (err) {
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/author/getAuthorByCode] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const accountCheck = async (authorId: number) => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw new ServerError('db connection error')
        let result = false

        const [getAuthor] = await conn.query(
            `SELECT 
                bankcode, 
                account_number AS accountNumber
            FROM author
            WHERE id = ${authorId}
            AND is_deleted = 'N'`
        )
        if (!getAuthor.length) throw new ConflictError('존재하지 않는 작가입니다.')

        // 실제 조회 요청
        const body = {
            bank_cd: getAuthor[0].bankcode,
            acct_no: getAuthor[0].accountNumber,
        }

        const response = await fetch(process.env.ACCOUNT_CHECK_API, {
            method: 'post',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
                'user-id': process.env.USER_ID,
                Hkey: process.env.H_KEY,
            },
        })

        const res = await response.json()

        // 가상 응답 값
        // const res = { name: '나지원', reply: '0000', reply_msg: '정상처리' }
        // const res = { name: '', reply: '0122', reply_msg: '입금계좌오류' }

        if (res.reply === '0000') result = true

        await conn.query(
            `INSERT 
                payment_log
            SET
                type = 2,
                is_success = ${res.reply === '0000' ? `'Y'` : `'N'`},
                reply_message = '${res.reply_msg}',
                author_id = ${authorId},
                bankcode = '${getAuthor[0].bankcode}',
                account_number = '${getAuthor[0].accountNumber}'
        `
        )

        return { result, data: res }
    } catch (err) {
        if (err instanceof ConflictError) throw new ConflictError(err.message)
        else throw new ServerError(`Error[sql/figk/author/accountCheck] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
