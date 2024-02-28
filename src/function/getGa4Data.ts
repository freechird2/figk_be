import dotenv from 'dotenv'
import { google } from 'googleapis'
import { ServerError } from 'model/common/error'
import { credentials } from '../../credentials'
dotenv.config()

export const getGA4Data = async (date: { startDate: string; endDate: string }) => {
    // 인증 클라이언트 생성
    try {
        const authClient = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
        })
        // Google Analytics Data 클라이언트 생성
        const analyticsDataClient = google.analyticsdata({
            version: 'v1beta',
            auth: authClient,
        })

        // GA4 데이터 요청
        const response = await analyticsDataClient.properties.runReport({
            property: `properties/${process.env.GA4_PROPERTY_ID}`,

            requestBody: {
                dateRanges: [
                    { startDate: date.startDate, endDate: date.endDate }, // 검색기간
                ],
                dimensions: [
                    { name: 'pagePath' }, // 세션 유입 경로 전체 사용자, 세션 계산해서 비율 산출
                    { name: 'date' },
                ],
                metrics: [
                    { name: 'activeUsers' }, // 전체 사용자
                ],
            },
        })

        return response.data
    } catch (err) {
        throw new ServerError(`Error[function/gaTrackingEvents/getGA4Data] : ${err}`)
    }
}
