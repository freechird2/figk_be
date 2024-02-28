import { CommonFigkParamModel } from 'model/figk/common'

export const getTextFigkJoin = `
LEFT JOIN (
    SELECT
        id AS authorId, email AS authorEmail, group_id, IF(nickname IS NULL OR nickname = '', name, nickname) AS authorName, introduction, g.groupName
    FROM author AS c_a
        LEFT JOIN (
            SELECT
                id AS g_id, name AS groupName
            FROM author_group
            WHERE is_deleted = 'N'
        ) AS g
        ON c_a.group_id = g.g_id
    WHERE is_deleted = 'N'
) AS a
ON ft.author_id = a.authorId

LEFT JOIN (
    SELECT
        admin.id AS adminId, name AS publisher
    FROM admin
    WHERE is_deleted = 'N'
) AS p
ON ft.publisher = p.adminId`

export const getTextFigkSelectDetail = (param: Partial<CommonFigkParamModel>) =>
    `SELECT 
        ft.id,
        ft.title,
        IFNULL(ft.sub_title,'') AS subTitle,
        ft.content,
        ft.status,
        IF(author.nickname IS NULL OR author.nickname = '', author.name, author.nickname) AS authorName,
        IFNULL(ag.name,'') AS groupName,
        author.email AS authorEmail,
        total_vote AS totalVote,
        link,
        ${param.id ? ` ft.status AS contestStatus,` : ``}
        ${
            param.isAdmin
                ? `
                IFNULL(DATE_FORMAT(ft.registered_at, '%y.%m.%d %H:%i'),'') AS registeredAt,
                IFNULL(DATE_FORMAT(ft.updated_at, '%y.%m.%d %H:%i'),'') AS updatedAt,
                IFNULL(DATE_FORMAT(ft.applied_at, '%y.%m.%d %H:%i'),'') AS appliedAt,
                IFNULL(DATE_FORMAT(ft.published_at, '%y.%m.%d %H:%i'),'') AS publishedAt,`
                : `ft.week,`
        }
        ${
            param.id
                ? `ft.week`
                : `IF(FIND_IN_SET(ft.id,((SELECT voted_figk FROM vote WHERE week = (SELECT text_week FROM config) AND ${
                      param.isAdmin ? `admin_id = ${param.userId}` : `author_id = ${param.userId}`
                  }))), 'Y','N') AS isVotedFigk`
        }`
