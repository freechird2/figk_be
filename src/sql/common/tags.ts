export const insertTagRelation = async (conn: any, id: number, type: 1 | 2) => {
    try {
        // insert 된 태그가져오기
        const [getTags] = await conn.query(
            `SELECT id, tags FROM ${type === 1 ? `figk_text` : `figk_art`} WHERE id = ${id}`
        )

        const tags = { id: getTags[0].id, tags: getTags[0].tags ? getTags[0].tags.split(',') : [] }
        // figk_tag_relation INSERT

        const insertQuery = `INSERT INTO figk_tag_relation(figk_id, tag_id, type) 
                            VALUES ${tags.tags.map((v: number) => `(${tags.id},${v},${type})`).join(',')}`
        await conn.query(insertQuery)

        return true
    } catch (err) {
        return false
    }
}

export const updateTagRelation = async (conn: any, id: number, type: 1 | 2) => {
    try {
        // insert 된 태그가져오기
        const [getTags] = await conn.query(
            `SELECT id, tags FROM ${type === 1 ? `figk_text` : `figk_art`} WHERE id = ${id}`
        )

        const [getRelation] = await conn.query(
            `SELECT id, tag_id FROM figk_tag_relation WHERE figk_id = ${id} AND type = ${type}`
        )

        const tagArr = getTags[0].tags ? getTags[0].tags.split(',').map((x) => parseInt(x)) : []
        const relationArr = getRelation.length > 0 ? getRelation.map((x) => x.tag_id) : []
        const deleteTag = relationArr.filter((x) => !tagArr.includes(x))
        const insertTag = tagArr.filter((x) => !relationArr.includes(x))

        if (insertTag.length > 0) {
            const insertQuery = `INSERT INTO figk_tag_relation(figk_id, tag_id, type)
                                VALUES ${insertTag.map((v: number) => `(${id},${v},${type})`).join(',')}`

            await conn.query(insertQuery)
        }

        if (deleteTag.length > 0) {
            const deleteQuery = `DELETE FROM figk_tag_relation WHERE id IN (${getRelation
                .filter((x) => deleteTag.includes(parseInt(x.tag_id)))
                .map((v) => v.id)
                .join(',')})`

            await conn.query(deleteQuery)
        }

        return true
    } catch (err) {
        return false
    }
}

export const deleteTagRelation = async (conn: any, id: number[], type: 1 | 2) => {
    try {
        await conn.query(`DELETE FROM figk_tag_relation 
                        WHERE figk_id IN (${id.join(',')}) AND type = ${type}`)
        return true
    } catch (err) {
        return false
    }
}

export const getTags = async (conn: any, res: any[], type: 1 | 2) => {
    try {
        const getSearchId = res.map((v) => v.id)
        if (getSearchId.length) {
            const [tags] = await conn.query(
                `SELECT tl.figk_id, tl.tag_id, t.name
                FROM figk_tag_relation AS tl
                LEFT JOIN tags AS t ON t.id = tl.tag_id
                WHERE figk_id IN (${getSearchId.join(',')})
                AND type = ${type}
                `
            )

            res.forEach((v) => {
                v.tag = []
                tags.forEach((e) => {
                    if (v.id === e.figk_id) {
                        v.tag.push({ id: e.tag_id, name: e.name })
                    }
                })
            })
        }

        return true
    } catch (err) {
        return false
    }
}
