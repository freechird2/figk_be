import { ServerError } from 'model/common/error'
import { MenuHeaderModel } from 'model/menu/menu'
import db from '../../database'

const insertMenuDB = async (conn: any, projectId: number, data: MenuHeaderModel) => {
    let isError = false
    const { title, status, url, parentId, children, depth } = data
    try {
        if (!title || !(status === 0 || status === 1) || !depth) {
            return -1
        }

        const ins = await conn.query(`
                    INSERT
                        menu
                    SET
                        title = '${title}',
                        depth = ${depth},                    
                        ${url ? `url = '${url}',` : ''}
                        ${parentId ? `parent_id = ${parentId},` : ''}
                        ${projectId ? `project_id = ${projectId},` : ''}
                        status = ${status}
                `)

        if (children && children.length > 0) {
            for (let c of children) {
                c.parentId = ins[0].insertId
                const cResult = await insertMenuDB(conn, projectId, c)

                if (cResult < 1) {
                    isError = true
                    break
                }
            }
        }

        if (ins[0].insertId < 1 || isError) return -1
    } catch (err) {
        throw new ServerError(err.message)
    } finally {
        if (conn) await conn.release()
    }

    return 1
}

// Menu insert
export const insertMenu = async (projectId: number, data: Array<MenuHeaderModel>) => {
    let result = 1
    let isError = false
    let conn = null

    try {
        conn = await db.getConnection()

        if (conn == null || data.length < 1) throw 'invalid Data'

        await conn.beginTransaction()

        for (let m of data) {
            const dbResult = await insertMenuDB(conn, projectId, m)

            if (dbResult < 1) {
                isError = true
                break
            }
        }

        if (isError) throw 'invaild Data'
        else await conn.commit()
    } catch (err) {
        await conn.rollback()
        throw new ServerError(`Error[sql//common/menu/insertMenu] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

// Menu list return
export const getMenu = async (userId: number) => {
    const conn = await db.getConnection()
    let menu: Array<MenuHeaderModel> = []
    let menuObj: { [key: string]: MenuHeaderModel } = {}

    try {
        if (conn == null) throw 'db connection error'

        const data = await conn.query(
            `SELECT 
                *
            FROM menu
            WHERE FIND_IN_SET(project_id, (
                SELECT
                    project_id
                FROM admin_project_auth
                WHERE admin_id = ${userId}
                )
            )
            AND is_deleted = 'N'
            AND \`status\` = 1
            ORDER BY depth ASC
        `
        )
        data[0].map((d) => {
            const { id, title, status, parent_id, project_id, url, depth } = d
            let m: MenuHeaderModel = {
                id: id,
                status: status,
                title: title,
                parentId: parent_id,
                projectId: project_id,
                children: [],
                depth: depth,
                url: url,
            }

            menuObj[id] = m
        })

        for (let m in menuObj) {
            if (menuObj[m].parentId) {
                menuObj[menuObj[m].parentId].children.push(menuObj[m])
            }
        }

        for (let m in menuObj) {
            if (!menuObj[m].parentId) menu.push(menuObj[m])
        }
    } catch (err) {
        throw new ServerError(`Error[sql//common/menu/getMenu] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return menu.sort((a, b) => (a.title > b.title ? 1 : -1))
}
