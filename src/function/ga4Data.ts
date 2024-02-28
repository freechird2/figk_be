export const gaData = (data) => {
    const users = []
    const dateUser = []
    const pageUserMap = {}
    const dayVisitor = {}
    const dayVisitorArr = []

    data.rows.forEach((row) => {
        const page = row.dimensionValues[0].value
        const date = row.dimensionValues[1].value
        const users = parseInt(row.metricValues[0].value)

        // 일자별 유저 합산
        if (dayVisitor[date]) {
            dayVisitor[date] += users
        } else {
            dayVisitor[date] = users
        }

        // 페이지별 유저 합산
        if (pageUserMap[page]) {
            pageUserMap[page] += users
        } else {
            pageUserMap[page] = users
        }

        // 일자별, 페이지 별 유저 수
        dateUser.push({ date, page, users })
    })
    dateUser.sort((a, b) => a.date - b.date)
    // 페이지별 유저 합산 결과 (users)
    for (const page in pageUserMap) {
        users.push({
            page: page,
            users: pageUserMap[page],
        })
    }
    const totalUser = users.map((v) => v.users).reduce((a, b) => a + b)
    const userData = users
        .map((v) => {
            return {
                page: v.page,
                users: v.users,
                traffic: Number(((v.users / totalUser) * 100).toFixed(1)),
            }
        })
        .sort((a, b) => b.users - a.users)
    for (const i in dayVisitor) {
        dayVisitorArr.push({
            date: i,
            users: dayVisitor[i],
        })
    }

    return {
        users: userData,
        dateUser,
        dayVistor: dayVisitorArr,
    }
}
