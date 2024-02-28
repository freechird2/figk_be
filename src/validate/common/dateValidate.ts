export const checkValidDate = async (value: { startDate: string; endDate: string }) => {
    let result = { start: false, end: false }
    const start = value.startDate.split('-')
    const end = value.endDate.split('-')

    const sy = parseInt(start[0], 10)
    const sm = parseInt(start[1], 10)
    const sd = parseInt(start[2], 10)
    const ey = parseInt(end[0], 10)
    const em = parseInt(end[1], 10)
    const ed = parseInt(end[2], 10)

    const dateRegex =
        /^(?=\d)(?:(?:31(?!.(?:0?[2469]|11))|(?:30|29)(?!.0?2)|29(?=.0?2.(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00)))(?:\x20|$))|(?:2[0-8]|1\d|0?[1-9]))([-.\/])(?:1[012]|0?[1-9])\1(?:1[6-9]|[2-9]\d)?\d\d(?:(?=\x20\d)\x20|$))?(((0?[1-9]|1[012])(:[0-5]\d){0,2}(\x20[AP]M))|([01]\d|2[0-3])(:[0-5]\d){1,2})?$/
    result.start = dateRegex.test(sd + '-' + sm + '-' + sy)
    result.end = dateRegex.test(ed + '-' + em + '-' + ey)
    return result
}
