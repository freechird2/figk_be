import { MailFormModel } from 'model/common/common'

export const createMailForm = (data: MailFormModel) => {
    let html = ``

    const { type, email, tempPw } = data

    if (type === 'changePassword') {
        html = `
                <div
                style="
                    width: min(100%, 600px);
                    box-sizing: border-box;
                    margin: 40px auto 80px;
                    border: 1px solid #eff0f1;
                    padding: 40px 50px 50px;
                    text-align: center;
                ">
                    <div style="text-align: center; margin-bottom: 40px">
                        <img
                            src="https://figk-dev.s3.ap-northeast-2.amazonaws.com/figk_logo_big.png"
                            alt="figk 로고"
                            style="width: 100px" />
                    </div>

                    <h1 style="margin: 0; color: #181818; font-size: 22px; font-weight: 600; text-align: center; margin-bottom: 30px">비밀번호를 확인해주세요.</h1>
                    <p style="color: #393c40 !important; line-height: 1.7; font-size: 14px; margin: 0 0 30px">
                        핔커님의 요청으로 임시 비밀번호를 발급해드렸습니다. <br />
                        FIGK에 로그인 후, 비밀번호로 꼭 변경해주세요.<br />
                        핔커님의 요청이 아니라면, <a style="color: #393c40; line-height: 1.7; font-size: 14px; text-decoration: none; cursor:default; pointer-events:none;">figk@fig.xyz</a>로 문의해주세요.
                    </p>
                    <div
                        style="
                            background-color: #fafafa;
                            padding: 14px;
                            text-align: center;
                            line-height: 1.5;
                            width: min(100%, 380px);
                            margin: 0 auto 50px;
                        ">
                        <p style="margin-block: 0">
                            <strong style="color: #393c40; font-size: 16px; font-weight: 600">임시 비밀번호</strong> :
                            <strong style="color: #ff4d00; font-size: 16px; font-weight: 600">${tempPw}</strong>
                        </p>
                    </div>
                    <div>
                        <a
                            href="https://studio.figk.net"
                            target="_blank"
                            style="display: inline-block; text-decoration: none"
                            ><div
                                style="
                                    background-color: #222326;
                                    color: #fff;
                                    font-size: 14px;
                                    font-weight: 500;
                                    border-radius: 999px;
                                    width: 190px;
                                    line-height: 48px;
                                    height: 48px;
                                ">
                                FIGK.STUDIO 바로가기
                            </div></a
                        >
                    </div>
                    <footer style="border-top: 2px solid #eff0f1; margin-top: 40px; padding-top: 30px">
                        <div style="text-align: center">
                            <a
                                href="https://figk.net"
                                title="figk.net"
                                style="text-decoration: none; color: #212121; font-size: 13px; padding-right: 16px"
                                >figk.net</a
                            >
                            <a
                                href="https://studio.figk.net"
                                title="studio.figk.net"
                                style="text-decoration: none; color: #212121; font-size: 13px"
                                >studio.figk.net</a
                            >
                        </div>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #9ea2a9">&#169;2022 FIG. ALL RIGHT RESERVED.</p>
                    </footer>
                </div>
        `
    } else if (type === 'inactiveAccount') {
        html = `<div
                    style="
                        width: min(100%, 600px);
                        box-sizing: border-box;
                        margin: 40px auto 80px;
                        border: 1px solid #eff0f1;
                        padding: 40px 50px 50px;
                        text-align: center;
                    ">
                    <div style="text-align: center; margin-bottom: 40px">
                        <img
                            src="https://figk-dev.s3.ap-northeast-2.amazonaws.com/figk_logo_big.png"
                            alt="figk 로고"
                            style="width: 100px" />
                    </div>

                    <h1 style="margin: 0; color: #181818; font-size: 22px; font-weight: 600; text-align: center; margin-bottom: 30px; line-height: 1.5">
                        FIGKER님의 ID가 <br />
                        비활성화 계정으로 전환되었습니다.
                    </h1>
                    <p style="color: #393c40; line-height: 1.7; font-size: 14px; margin: 0 0 30px">
                        핔커님의 FIGK ID가 비활성화 처리되었음을 알려드립니다. <br />
                        다시 활동을 이어가시려면 <a style="color: #393c40; line-height: 1.7; font-size: 14px; text-decoration: none; cursor:default; pointer-events:none;">figk@fig.xyz</a>로 문의해주세요.
                    </p>
                    <div
                        style="
                            background-color: #fafafa;
                            padding: 14px;
                            text-align: center;
                            line-height: 1.5;
                            margin-bottom: 50px;
                            width: min(100%, 380px);
                            margin: 0 auto 50px;
                        ">
                        <p style="margin-block: 0">
                            <strong style="color: #393c40; font-size: 16px; font-weight: 600">ID : 
                                <a style="color: #393c40; front-size: 16px; font-weight: 600; text-decoration: none; cursor:default; pointer-events:none;">${email}</a>
                            </strong>
                        </p>
                    </div>
                    <footer style="border-top: 2px solid #eff0f1; margin-top: 40px; padding-top: 30px">
                        <div style="text-align: center">
                            <a
                                href="https://figk.net"
                                title="figk.net"
                                style="text-decoration: none; color: #212121; font-size: 13px; padding-right: 16px"
                                >figk.net</a
                            >
                            <a
                                href="https://studio.figk.net"
                                title="studio.figk.net"
                                style="text-decoration: none; color: #212121; font-size: 13px"
                                >studio.figk.net</a
                            >
                        </div>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #9ea2a9">&#169;2022 FIG. ALL RIGHT RESERVED.</p>
                    </footer>
                </div>`
    } else if (type === 'rejectText') {
        html = `<div
                    style="
                        width: min(100%, 600px);
                        box-sizing: border-box;
                        margin: 40px auto 80px;
                        border: 1px solid #eff0f1;
                        padding: 40px 50px 50px;
                        text-align: center;
                    ">
                    <div style="text-align: center; margin-bottom: 40px">
                        <img
                            src="https://figk-dev.s3.ap-northeast-2.amazonaws.com/figk_logo_big.png"
                            alt="figk 로고"
                            style="width: 100px" />
                    </div>

                    <h1 style="margin: 0; color: #181818; font-size: 22px; font-weight: 600; text-align: center; margin-bottom: 30px; line-height: 1.3">
                        FIGKER님의 글을 다시 확인해주세요.
                    </h1>
                    <p style="color: #393c40; line-height: 1.7; font-size: 14px; margin: 0 0 50px">
                        안녕하세요, 취향과 시선을 큐레이션하는 인사이트 플랫폼 FIGK입니다. <br />
                        핔커님이 송고한 글이 <span style="color: #ff4d00; font-weight: 600">투표 목록에서 제외</span>되었음을 알려드립니다. <br />
                        제외 사유 및 기타 궁금하신 사항은 <a style="color: #393c40; line-height: 1.7; font-size: 14px; text-decoration: none; cursor:default; pointer-events:none;">figk@fig.xyz</a>로 문의해주세요.
                    </p>

                    <div>
                        <a
                            href="https://studio.figk.net"
                            target="_blank"
                            style="display: inline-block; text-decoration: none"
                            ><div
                                style="
                                    background-color: #222326;
                                    color: #fff;
                                    font-size: 14px;
                                    font-weight: 500;
                                    border-radius: 999px;
                                    width: 190px;
                                    line-height: 48px;
                                    height: 48px;
                                ">
                                FIGK.STUDIO 바로가기
                            </div></a
                        >
                    </div>
                    <footer style="border-top: 2px solid #eff0f1; margin-top: 40px; padding-top: 30px">
                        <div style="text-align: center">
                            <a
                                href="https://figk.net"
                                title="figk.net"
                                style="text-decoration: none; color: #212121; font-size: 13px; padding-right: 16px"
                                >figk.net</a
                            >
                            <a
                                href="https://studio.figk.net"
                                title="studio.figk.net"
                                style="text-decoration: none; color: #212121; font-size: 13px"
                                >studio.figk.net</a
                            >
                        </div>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #9ea2a9">&#169;2022 FIG. ALL RIGHT RESERVED.</p>
                    </footer>
                </div>`
    }

    return html
}
