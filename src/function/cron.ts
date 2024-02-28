import { ServerError } from 'model/common/error'
import schedule from 'node-schedule'
// import { artFigkAutoPublish } from 'sql/figk/artFigk'
import { updateProcessStatus } from 'sql/figk/config'
import { getCronSetting, getIsPause } from 'sql/figk/cronSetting'
import { payEvent } from 'sql/figk/payEvent'
import { textFigkStartApply } from 'sql/figk/textFigk'
// import { reserveNotice } from 'sql/figk/notice'
// import { trendFigkAutoPublish } from 'sql/figk/trendFigk'
// * * * * * *
// 초 분 시 일 월 주
let jobs = {
    startVotingJob: null,
    closingVoteJob: null,
    startApplyJob: null,
    artFigkAutoPublishJob: null,
    trendFigkAutoPublishJob: null,
    publishNoticeJob: null,
    sendingJudgmentJob: null,
}

// [CM003]
export const startProcessStatusCron = async () => {
    const res = await getCronSetting()

    if (!res.resCron) {
        throw new ServerError('cron 초기화 중 오류가 발생했어요.')
    }

    // text figk 자동 발행 cron  -> config.process_status, group 변경 cron
    jobs.startApplyJob = schedule.scheduleJob(
        `${res.resCron.text_figk_start_apply_min || 0} ${res.resCron.text_figk_start_apply_hour || 0} * * ${
            res.resCron.text_figk_start_apply_day || 0
        }`,
        async () => {
            await payEvent('P')
            await textFigkStartApply()
        }
    )

    // art figk 자동 발행 cron -> 예약발행 기획 삭제로 인한 주석처리[0703]
    // jobs.artFigkAutoPublishJob = schedule.scheduleJob(
    //     `${res.resCron.art_figk_auto_publish_min || 0} ${res.resCron.art_figk_auto_publish_hour || 0} * * ${
    //         res.resCron.art_figk_auto_publish_day || 0
    //     }`,
    //     async () => {
    //         await artFigkAutoPublish()
    //     }
    // )

    // [23.04.24 njw] trend figk 삭제
    // trend figk 자동 발행 cron
    // jobs.trendFigkAutoPublishJob = schedule.scheduleJob(
    //     `${res.resCron.trend_figk_auto_publish_min || 0} ${res.resCron.trend_figk_auto_publish_hour || 0} * * ${
    //         res.resCron.trend_figk_auto_publish_day || 0
    //     }`,
    //     async () => {
    //         await trendFigkAutoPublish()
    //     }
    // )

    // 송고 심사
    jobs.sendingJudgmentJob = schedule.scheduleJob(
        `${res.resCron.sending_judgment_min || 0} ${res.resCron.sending_judgment_hour || 0} * * ${res.resCron.sending_judgment_day || 0}`,
        async () => {
            const isPause = await getIsPause()
            if (isPause[0].isPause === 'N') {
                await updateProcessStatus('T')
            }
        }
    )

    // 투표시작
    // process status 투표 중 상태로 변경하는 cron
    jobs.startVotingJob = schedule.scheduleJob(
        `${res.resCron.start_voting_min || 0} ${res.resCron.start_voting_hour || 0} * * ${res.resCron.start_voting_day || 0}`,
        async () => {
            const isPause = await getIsPause()
            if (isPause[0].isPause === 'N') {
                await updateProcessStatus('V')
                await payEvent('A')
            }
        }
    )

    // 투표마감
    jobs.closingVoteJob = schedule.scheduleJob(
        `${res.resCron.closing_vote_min || 0} ${res.resCron.closing_vote_hour || 0} * * ${res.resCron.closing_vote_day || 0}`,
        async () => {
            const isPause = await getIsPause()

            if (isPause[0].isPause === 'N') {
                await updateProcessStatus('C')
                await payEvent('V')
            }
        }
    )
}

// cron 재시작
export const restartProcessStatusCron = async () => {
    for (let job of Object.values(jobs)) {
        if (job) job.cancel()
    }

    await startProcessStatusCron()
}
