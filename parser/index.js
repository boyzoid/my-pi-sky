import { SerialPort } from "serialport"
import { ReadlineParser } from '@serialport/parser-readline'
import GPS from "gps"
import * as dotenv from 'dotenv'
dotenv.config()

import DocumentStore from "../app/DocumentStore.js";
const docStore = new DocumentStore(
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    process.env.DB_HOST,
    process.env.DB_PORT,
    process.env.DB_SCHEMA,
    process.env.DB_COLLECTION
);

const port = new SerialPort({path: '/dev/ttyUSB0', baudRate: 9600})
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }))
const gps = new GPS
let startDate = new Date()
startDate.setMinutes(startDate.getMinutes() - 1)

console.log(startDate)

gps.on('data', async (parsed)=>{
    const diff = Math.abs(startDate - parsed.time)
    const sec = Math.floor((diff/1000))
    const now = new Date()
    if(sec > 30 && now.getFullYear() === parsed.time.getFullYear()){
        startDate = parsed.time
        try{
            await docStore.addLocation(parsed)
        }
        catch(e){
            console.log('DB Error')
        }
    }
})

parser.on('data', (data)=>{
    try{
        gps.update(data)
    }
    catch(e){
    }
})
