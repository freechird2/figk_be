import { ServerError } from 'model/common/error'
import { MigrationArtFigkModel } from 'model/migration/artFigk'
import { MigrationTextFigkModel } from 'model/migration/textFigk'
import { MigrationUserModel } from 'model/migration/users'
import { MigrationVoteModel } from 'model/migration/vote'

import db from '../../database'

const insertApprover = async (conn: any, data: Array<MigrationUserModel>) => {
    let returnResult = -1
    try {
        if (!conn) throw 'db connection error'

        await conn.beginTransaction()

        data.map(async (d) => {
            const result = await conn.query(`SELECT 
                                                (SELECT
                                                    id
                                                FROM admin
                                                WHERE uid = '${d.uid}'
                                                ) as adminIdx
                                                , id
                                            from admin
                                            WHERE uid = '${d.approver}'
                                            `)

            if (result[0] && result[0][0] && result[0][0].id && result[0][0].adminIdx) {
                await conn.query(`UPDATE 
                                    admin
                                SET approver = ${result[0][0].id}
                                WHERE id = ${result[0][0].adminIdx}`)
            }
        })

        await conn.commit()
        returnResult = 1
    } catch (err) {
        await conn.rollback()
        throw new ServerError(`Error[router/maigration/insertApprover] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return returnResult
}

// 관리자 데이터 migration
export const migrationAdmin = async (data: Array<MigrationUserModel>) => {
    const conn = await db.getConnection()
    let returnResult = -1
    try {
        if (conn == null) throw 'db connection error'
        await conn.beginTransaction()
        let query = `INSERT INTO admin (uid, name, password, email, is_approve, approved_at) VALUES`

        data.map((d: MigrationUserModel) => {
            query += ` ('${d.uid}', '${d.name}', '${d.password}', '${d.email}', '${d.isApprove}', ${
                d.approvedAt ? `'${d.approvedAt}'` : 'NULL'
            }),`
        })

        const result = await conn.query(query.slice(0, query.length - 1))

        if (result[0].affectedRows > 0) {
            await conn.commit()
            await insertApprover(conn, data)

            returnResult = result[0].affectedRows
        } else await conn.rollback()
    } catch (err) {
        await conn.rollback()
        throw new ServerError(`Error[router/maigration/users] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return returnResult
}

// 작가 데이터 migration
export const migrationAuthor = async (data: Array<MigrationUserModel>) => {
    const conn = await db.getConnection()
    let returnResult = -1

    try {
        if (conn == null) throw 'db connection error'

        await conn.beginTransaction()

        data.map(async (d: MigrationUserModel) => {
            let adminApprover = null

            if (d.approver) {
                const adminQuery = await conn.query(`SELECT 
                                                        id
                                                    FROM admin
                                                    WHERE uid = '${d.approver}'`)

                if (adminQuery[0] && adminQuery[0][0] && adminQuery[0][0].id) adminApprover = adminQuery[0][0].id
            }

            await conn.query(`INSERT
                                author
                            SET
                                uid = '${d.uid}',
                                code = '${d.code}',
                                email = '${d.email}',
                                password = '${d.password}',
                                introduction = '${d.introduction.replace(/'/g, "''")}',
                                name = '${d.name}',
                                is_approve = '${d.isApprove}',
                                ${adminApprover ? `approver = ${adminApprover},` : ``}
                                approved_at = ${d.approvedAt ? `'${d.approvedAt}'` : `NULL`},
                                is_deleted = '${d.isDeleted}'
                            `)
        })

        await conn.commit()
    } catch (err) {
        await conn.rollback()
        throw new ServerError(`Error[router/maigration/users] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return returnResult
}

export const getUidToAuthorId = async (uid: string) => {
    let result = -1
    let conn = null

    if (!uid) return result

    try {
        conn = await db.getConnection()
        if (!conn) throw 'db connection error'

        const res = await conn.query(`SELECT id FROM author WHERE uid = '${uid}'`)
        result = res[0][0] ? res[0][0].id : 0
    } catch (err) {
        result = -1
        throw new ServerError(`Error[router/maigration/getUidToAuthorId] : ${err}`)
    } finally {
        conn.release()
    }

    return result
}

export const getUidToAdminId = async (uid: string) => {
    let result = -1
    let conn = null

    if (!uid) return 5

    try {
        conn = await db.getConnection()
        if (!conn) throw 'db connection error'
        const res = await conn.query(`SELECT id FROM admin WHERE uid = '${uid}'`)
        if (!res[0][0]) return 5
        result = res[0][0].id
    } catch (err) {
        result = 5
        throw new ServerError(`Error[router/maigration/getUidToAdminId] : ${err}`)
    } finally {
        conn.release()
    }

    return result
}

export const initTextFigkDB = async () => {
    let conn = null

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        await conn.query(`DELETE FROM figk_text`)
        await conn.query(`ALTER TABLE figk_text AUTO_INCREMENT 1`)
    } catch (error) {
        throw new ServerError(`Error[router/maigration/initTextFigkDB] : Init Text Figk DB`)
    }
}

export const migrationTextFigk = async (data: Array<MigrationTextFigkModel>) => {
    let result = -1
    let conn = null

    if (!data || data.length < 1) return result

    let query = ''

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        await conn.beginTransaction()

        for (let d of data) {
            let tags = ''
            if (d.tags?.length > 0) {
                tags = await getTagsId(d.tags)
            }

            query = `
                    INSERT
                        figk_text
                    SET
                        author_id = ${d.authorId},
                        uid = '${d.uid}',
                        title = '${d.title?.replace(/'/g, `''`)}',
                        sub_title = '${d.subTitle?.replace(/'/g, `''`)}',
                        content = '${d.content?.replace(/'/g, `''`)}',
                        link = '${d.link?.replace(/'/g, `''`)}',
                        week = ${d.week},
                        is_published = '${d.isPublished}',
                        published_at = ${d.publishedAt ? `'${d.publishedAt}'` : 'NULL'},
                        publisher = ${d.publisher ? `${d.publisher}` : 'NULL'},
                        registered_at = '${d.registeredAt}',
                        tags = ${tags ? `'${tags}'` : 'NULL'},
                        is_deleted = '${d.isDeleted}'
                    `

            const qRe = await conn.query(query)

            if (qRe[0].insertId < 1) {
                throw 'insert failed'
            }
        }
        await conn.commit()
        result = 1
    } catch (err) {
        await conn.rollback()
        result = -1
        throw new ServerError(`Error[router/maigration/migrationTextFigk] : ${query} ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

export const getTagsId = async (data: Array<string>) => {
    let result = ''
    let conn = null

    if (!data || data.length < 1) return result

    try {
        conn = await db.getConnection()

        if (!conn) throw 'db connection error'

        await conn.beginTransaction()

        const idArr = []

        for (let d of data) {
            const res = await conn.query(`SELECT id FROM tags WHERE \`name\` = '${d?.replace(/'/g, `''`)}'`)

            if (res[0] && res[0][0] && res[0][0].id) {
                idArr.push(res[0][0].id)
            } else {
                // 실데이터 마이그레이션 시 d trim 추가 필요
                const ins = await conn.query(`INSERT tags SET name = '${d?.replace(/'/g, `''`)}'`)
                if (ins[0] && ins[0].insertId) idArr.push(ins[0].insertId)
            }
        }

        if (idArr.length > 0) result = idArr.join(',')

        await conn.commit()
    } catch (err) {
        await conn.rollback()
        result = ''
        throw new ServerError(`Error[router/maigration/getTagsId] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

export const migraionVote = async (data: Array<MigrationVoteModel>) => {
    let result = false
    let conn = null

    try {
        conn = await db.getConnection()
        if (!conn) throw 'db connection error'

        await conn.beginTransaction()

        for (let d of data) {
            const votedArr = []
            if ((d.week === 16 && d.authorId === 0) || (d.week === 17 && d.authorId === 0)) continue

            if (d.textFigk.length > 0) {
                for (let v of d.textFigk) {
                    const [ins] = await conn.query(`SELECT id FROM figk_text WHERE uid = '${v}'`)

                    if (ins && ins[0] && ins[0].id > 0) {
                        await conn.query(`UPDATE figk_text SET total_vote = total_vote + 1 WHERE id = ${ins[0].id}`)
                        votedArr.push(ins[0].id)
                    }
                }
            }

            const [ins] = await conn.query(`INSERT 
                                                vote 
                                            SET 
                                                author_id = ${d.authorId},
                                                week = ${d.week},
                                                voted_figk = ${votedArr.length > 0 ? `'${votedArr.join(',')}'` : 'NULL'}
                                            `)

            if (!ins || ins.insertId < 1) throw 'insert error'
        }

        await conn.commit()
        result = true
    } catch (err) {
        await conn.rollback()
        result = false
        throw new ServerError(`Error[router/migration/migraionVote] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

export const migrationArtFigk = async (data: Array<MigrationArtFigkModel>) => {
    let result = -1
    let conn = null
    if (!data) return result
    let tag = ''

    try {
        conn = await db.getConnection()
        if (!conn) throw 'db connection error'

        await conn.beginTransaction()

        for (const i of data) {
            // const tags = i.tags ? JSON.stringify(i.tags).replace(/"/g, ``) : null
            const title = i.title ? i.title.replace(/'/g, `''`) : null

            // let tagArr = tags ? tags.split(',') : null
            if (i.tags) {
                i.tags.map((t, j) => {
                    t = t.trim()
                })

                tag = await getTagsId(i.tags)
            }

            const qRe = await conn.query(`
            INSERT
                figk_art
            SET
                week = ${i.week},
                tags = ${i.tags ? `'${tag}'` : 'NULL'},
                title = ${title ? `'${title}'` : 'NULL'},
                jacket_file_id = ${i.jacketFileId ? `'${i.jacketFileId}'` : 'NULL'} ,
                video_file_id = ${i.videoFileId ? `'${i.videoFileId}'` : 'NULL'},
                publisher = ${i.publisher},
                published_at = '${i.publishedAt}',
                is_published = 'Y',
                register = ${i.register},
                registered_at = '${i.registeredAt}',
                updated_at = '${i.registeredAt}'
            `)

            if (qRe[0].insertId < 1) {
                throw 'insert failed'
            }
        }

        await conn.commit()
    } catch (err) {
        await conn.rollback()
        result = -1
        throw new ServerError(`Error[router/maigration/migrationArtFigk] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
    return result
}

export const migrationTagRelation = async () => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw 'db connection error'

        await conn.beginTransaction()
        const [tagIds] = await conn.query(`SELECT id,tags FROM figk_text `)

        const tagArr = tagIds.map((v) => {
            if (v.tags) return { id: v.id, tag: v.tags.split(',') }
        })

        for (const i of tagArr) {
            if (!i) continue

            for (const j of i.tag) {
                await conn.query(
                    `INSERT figk_tag_relation
                    SET figk_id = ${i.id},
                    tag_id = ${j},
                    type = 1
                    `
                )
            }
        }

        await conn.commit()
    } catch (err) {
        await conn.rollback()
        throw new ServerError(`Error[router/maigration/migrationTagRelation] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const migrationTagRelationArtFigk = async () => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw 'db connection error'
        await conn.beginTransaction()
        const [tagIds] = await conn.query(`SELECT id,tags FROM figk_art `)
        const tagArr = tagIds.map((v) => {
            if (v.tags) return { id: v.id, tag: v.tags.split(',') }
        })
        for (const i of tagArr) {
            if (!i) continue

            for (const j of i.tag) {
                await conn.query(
                    `INSERT figk_tag_relation
                    SET figk_id = ${i.id},
                    tag_id = ${j},
                    type = 2
                    `
                )
            }
        }

        await conn.commit()
    } catch (err) {
        await conn.rollback()
        throw new ServerError(`Error[router/maigration/migrationTagRelationArtFigk] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}

export const migratinoFileRelation = async () => {
    let conn = null
    try {
        conn = await db.getConnection()
        if (!conn) throw 'db connection error'
        await conn.beginTransaction()
        const [artfigkIds] = await conn.query(`SELECT id, 
                                                    jacket_file_id, 
                                                    video_file_id 
                                                    FROM figk_art `)
        const fileArr = artfigkIds.map((v) => {
            return { id: v.id, jacketFileId: v.jacket_file_id?.split(','), videoFileId: v.video_file_id }
        })

        for (const i of fileArr) {
            for (const j of i.jacketFileId) {
                await conn.query(
                    `INSERT file_relation
                    SET art_figk_id = ${i.id},
                    file_id = ${j},
                    type = 1
                    `
                )
            }
            await conn.query(`INSERT INTO file_relation SET art_figk_id = ${i.id},
            file_id = ${i.videoFileId}, type = 2`)
        }

        await conn.commit()
    } catch (err) {
        await conn.rollback()
        throw new ServerError(`Error[router/maigration/migrationTagRelationArtFigk] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }
}
