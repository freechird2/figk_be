const mysql = require('mysql2/promise')
const env = require('dotenv')

env.config()

const host = process.env.NODE_ENV === 'dev' ? process.env.DEV_HOST : process.env.FIG_HOST
const user = process.env.NODE_ENV === 'dev' ? process.env.DEV_USER : process.env.FIG_USER

const pool = mysql.createPool({
    host: host,
    user: user,
    password: process.env.FIG_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
    enableKeepAlive: true,
})

const zeroonePool = mysql.createPool({
    host: host,
    user: user,
    password: process.env.FIG_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
    enableKeepAlive: true,
})

class DataBaseManager {
    getConnection = async () => {
        let poolConnection: any = null

        try {
            poolConnection = await pool.getConnection()
        } catch (err) {
            console.log(err)
        }

        return poolConnection
    }

    getZeroOneConnection = async () => {
        let poolConnection: any = null

        try {
            poolConnection = await zeroonePool.getConnection()
        } catch (err) {
            console.log(err)
        }

        return poolConnection
    }

    query = async (sql: string) => {
        let poolConnection: any = null

        try {
            poolConnection = await pool.getConnection()
        } catch (err) {
            console.log(err)
        }

        if (poolConnection == null) return false

        try {
            const r = await poolConnection.query(sql).catch(() => {
                return false
            })
            poolConnection.release()

            return r ? r[0] : false
        } catch (err) {
            console.log(err)
            poolConnection.release()

            return false
        }
    }
}

export = new DataBaseManager()
