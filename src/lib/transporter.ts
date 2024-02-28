import 'dotenv/config'
import nodemailer, { Transporter } from 'nodemailer'

/* 메일 전송 대상(Gmail) */
export const getTransporter = async () => {
    const transporter: Transporter = nodemailer.createTransport({
        /* Gmail Host */
        host: 'smtp.gmail.com',
        /* Mail port */
        port: 465,
        /* your Mail Service Accounts */
        auth: {
            /* Gmail EMAIL */
            user: process.env.MAILS_EMAIL,
            /* Gmail PWD */
            pass: process.env.MAILS_PWD,
        },
        secure: true,
    })
    return transporter
}
