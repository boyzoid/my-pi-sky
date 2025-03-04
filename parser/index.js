import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import GPS from 'gps'
import * as crypto from 'node:crypto'
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

const port = new SerialPort({path: '/dev/ttyS0', baudRate: 9600})
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }))

const gps = new GPS
const uuid = crypto.randomUUID()
let lastPoint = null

console.log('App started')

const validData = (data, lastPoint) => {
    if(data.type === 'GGA'){
        const distance = GPS.Distance(
            lastPoint.lat, 
            lastPoint.lon, 
            data.lat, 
            data.lon) * 3280.84 //distance in feet
        const timeDiff = (data.time && lastPoint.time) 
            ? data.time.getTime() - lastPoint.time.getTime() : 0
        return data.valid
            && data.satellites > 3
            && data.hdop <= 1.5
            && timeDiff > 500
            && (distance) >= 2 
        }
    else{
        return false
    }
}  

gps.on('data', async (data)=>{
    let valid = false
    if(!lastPoint){
        lastPoint = {lat: data.lat, lon: data.lon, time: data.time}
    }
    valid = validData(data, lastPoint)
    
    if(valid){
        const loc = {
            lat: data.lat,
            lon: data.lon,
            speed: data.speed,
            time: data.time,
            synced: false,
            tripId: uuid
        }
        try{
            await docStore.addLocation(loc)
            lastPoint = {lat: loc.lat, lon: loc.lon, time:loc.time}
        }
        catch(e){
            console.log('DB Error')
            console.log(e)
        }
    }
})

parser.on('data', (data)=>{
    try{
        gps.update(data)
    }
    catch(e){
        console.log('Parse Error')
        console.log(e)
    }
})

const syncData = () =>{
    docStore.syncData()
}
//Start syncing data.
setInterval(syncData, 30000)
