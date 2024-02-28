import { Request, Response } from 'express'
import 'express-async-errors'
import { startProcessStatusCron } from 'function/cron'
import { errorHandler } from 'middleware/errorHandler'
const { sanitizer } = require('./src/middleware/sanitizer')

const port = process.env.PORT || 3100

const bodyParser = require('body-parser')
const cors = require('cors')
const express = require('express')
const indexRouter = require('router')
const app = express()

const whitelist = ['http://localhost', 'https://figk.net', 'https://studio.figk.net', 'https://fig-zone.com']

const corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1) {
            // 만일 whitelist 배열에 origin인자가 있을 경우
            callback(null, true) // cors 허용
        } else {
            callback(new Error('Not Allowed Origin!')) // cors 비허용
        }
    },
}

app.use(cors(corsOptions))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use('/', sanitizer, indexRouter)

// 404 Error Handling
app.use(function (req: Request, res: Response) {
    res.status(404).json({ code: 404, message: '지원하지 않는 API URI입니다.' })
})

app.use(errorHandler)

app.listen(port, async () => {
    await startProcessStatusCron()

    process.env.NODE_ENV === 'dev'
        ? console.log(`FIG ADMIN Dev Server listening on port ${port}`)
        : console.log(`FIG ADMIN Production Server listening on port ${port}`)
})
