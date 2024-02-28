import { FileUploadModel } from 'model/file/file'
import db from '../../database'

export const uploadFile = async (data: FileUploadModel) => {
    const conn = await db.getConnection()
    let result = -1

    if (!conn) return result

    try {
        const [res] = await conn.query(`
            INSERT
                files
            SET
                file_transed_name = '${data.fileTransedName}',
                file_origin_name = '${data.fileOriginName}',
                file_extension = '${data.fileExtension}',
                file_size = '${data.fileSize}'
        `)
        if (res.insertId) {
            result = res.insertId
        }
    } catch (err) {
        console.log(`single uploader failed`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

export const getFileIdx = async (data: string) => {
    const conn = await db.getConnection()
    let list = null
    if (!conn) return -1

    try {
        list = await conn.query(`SELECT 
                                    id
                                FROM
                                    files
                                WHERE file_transed_name ='${data}'
        `)
        if (list[0][0]) {
            list = list[0][0].id
        } else {
            list = []
        }
    } catch (err) {
    } finally {
        if (conn) await conn.release()
    }

    return list
}

export const getFileListWithIdxs = async (ids: Array<number>) => {
    const conn = await db.getConnection()
    let result = null

    if (!conn) return null

    try {
        const [res] = await conn.query(`SELECT 
                                            id, 
                                            file_transed_name
                                        FROM
                                            files
                                        WHERE id IN (${ids.join(',')})
                                `)

        result = res
    } catch (err) {
        console.log(`Error[sql/common/file/getFileListWithIdxs] : ${err}`)
    } finally {
        if (conn) await conn.release()
    }

    return result
}

// export const getFiles = async (conn: any, res: any[], isAdmin: boolean) => {
//     /*
//         try {
//         const getSearchId = res.map((v) => v.id)
//         if (getSearchId.length) {
//             const [files] = await conn.query(
//                 `SELECT
//                     fr.art_figk_id,
//                   ${isAdmin ? `f.file_transed_name ` : `f.file_origin_name`} AS fileName,
//                     f.id,
//                     fr.type
//             FROM file_relation AS fr
//             LEFT JOIN files AS f ON f.id = fr.file_id
//             WHERE art_figk_id IN (${getSearchId.join(',')})
//             `
//             )

//             res.forEach((v) => {
//                 v.jacketUrl = []
//                 v.videoUrl = []
//                 files.forEach((e) => {
//                     if (e.art_figk_id === v.id && e.type === 1) {
//                         v.jacketUrl.push(e.fileName)
//                     }
//                     if (e.art_figk_id === v.id && e.type === 2) {
//                         v.videoUrl = e.fileName
//                     }
//                 })
//             })
//         }
//         return true
//     }
//      */

//     try {
//         const getSearchId = res.map((v) => v.id)
//         if (getSearchId.length) {
//             const [files] = await conn.query(
//                 `SELECT
//                     fr.art_figk_id,
//                     f.file_transed_name,
//                     f.id,
//                     fr.type
//             FROM file_relation AS fr
//             LEFT JOIN files AS f ON f.id = fr.file_id
//             WHERE art_figk_id IN (${getSearchId.join(',')})
//             `
//             )

//             res.forEach((v) => {
//                 v.jacketUrl = []
//                 v.videoUrl = []
//                 files.forEach((e) => {
//                     if (e.art_figk_id === v.id && e.type === 1) {
//                         v.jacketUrl.push(e.file_transed_name)
//                     }
//                     if (e.art_figk_id === v.id && e.type === 2) {
//                         v.videoUrl = e.file_transed_name
//                     }
//                 })
//             })
//         }
//         return true
//     } catch (err) {
//         console.log(err)

//         return false
//     }
// }

// export const insertFileRelation = async (conn: any, id: number) => {
//     try {
//         // insert 된 파일 가져오기

//         const [getFiles] = await conn.query(`SELECT id, jacket_file_id, video_file_id FROM figk_art WHERE id = ${id}`)

//         const files = {
//             id: getFiles[0].id,
//             jacketFiles: getFiles[0].jacket_file_id ? getFiles[0].jacket_file_id.split(',') : [],
//         }
//         // file_relation INSERT

//         const insertQuery = `INSERT INTO file_relation(art_figk_id, file_id, type)
//                             VALUES ${files.jacketFiles.map((v: number) => `(${files.id},${v}, 1)`).join(',')},
//                             (${files.id},${getFiles[0].video_file_id}, 2)`

//         await conn.query(insertQuery)

//         return true
//     } catch (err) {
//         return false
//     }
// }

// export const updateFileRelation = async (conn: any, id: number) => {
//     try {
//         // insert 된 파일 가져오기
//         const [getFiles] = await conn.query(`SELECT id, jacket_file_id, video_file_id FROM figk_art WHERE id = ${id}`)

//         await conn.query(`DELETE FROM file_relation WHERE art_figk_id = ${getFiles[0].id}`)
//         const insertQuery = `INSERT INTO file_relation(art_figk_id, file_id, type)
//         VALUES${getFiles[0].jacket_file_id.split(',').map((v) => `(${getFiles[0].id}, ${v}, 1)`)},(${getFiles[0].id},${
//             getFiles[0].video_file_id
//         }, 2)`

//         await conn.query(insertQuery)
//         return true
//     } catch (err) {
//         return false
//     }
// }

// export const deleteFileRelation = async (conn: any, ids: Array<number>) => {
//     try {
//         await conn.query(`DELETE FROM file_relation
//                         WHERE art_figk_id IN (${ids.join(',')})`)
//         return true
//     } catch (err) {
//         return false
//     }
// }
