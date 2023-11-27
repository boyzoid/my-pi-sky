import { SerialPort } from "serialport"
import { ReadlineParser } from '@serialport/parser-readline'
import GPS from "gps"
import * as dotenv from 'dotenv'
import * as mysqlx from '@mysql/xdevapi'
dotenv.config()

const port = new SerialPort({path: '/dev/ttyUSB0', baudRate: 9600})
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }))
const gps = new GPS
let startDate = new Date()
startDate.setMinutes(startDate.getMinutes() - 1)
const connectionString = `mysqlx://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:33060/${process.env.DB_SCHEMA}`
const dbCollection = process.env.DB_COLLECTION
const dbSchema = process.env.DB_SCHEMA

const pool = mysqlx.getClient(connectionString,{
    pooling: {
                enabled: true,
                maxSize: 10,
                maxIdleTime: 20000,
                queueTimeout: 5000
            }
})

console.log(startDate)

gps.on('data', async (parsed)=>{
    let diff = Math.abs(startDate - gps.state.time)
    let sec = Math.floor((diff/1000))
    if(sec > 30){
        startDate = parsed.time
        const session = await pool.getSession()
        const schema = session.getSchema(dbSchema)
        const collection = schema.getCollection(dbCollection)
        try{
            await collection.add(gps.state).execute()
        }
        catch(e){
            console.log('DB Error')
        }
        session.close()
    }
})

parser.on('data', (data)=>{
    try{
        gps.update(data)
    }
    catch(e){
    }
})
