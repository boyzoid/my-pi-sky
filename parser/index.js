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
    33060,
    process.env.DB_SCHEMA,
    process.env.DB_COLLECTION
);

const port = new SerialPort({path: '/dev/ttyS0', baudRate: 9600})
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }))

const gps = new GPS
let startDate = new Date()
startDate.setMinutes(startDate.getMinutes() - 1)
const uuid = crypto.randomUUID()
let lastPoint = null

console.log('App started')

const validData = (data, lastPoint) => {
    const distance = GPS.Distance(lastPoint.lat, lastPoint.lon, data.lat, data.lon) * 3280.84
    let timeDiff = 0
    try{
        timeDiff = data.time.getTime() - lastPoint.time.getTime()
    }
    catch(e){
        return false
    }
    //console.log({errors: data.errors, timeDiff: timeDiff, distance: distance, hdop: data.hdop, sats: Array.isArray(data.satsActive) ? data.satsActive.length : null})
    return data.errors === 0 
        && (Array.isArray(data.satsActive) && data.satsActive.length > 3)
        && data.hdop <= 1.5
        && timeDiff > 1000
        && (distance) >= 2 //2 feet
    }

gps.on('data', async (data)=>{
    if(data.type == 'GGA'){
console.log(data)
    }
    
    if(!lastPoint){
        lastPoint = {lat: gps.state.lat, lon: gps.state.lon, time: gps.state.time}
    }
    const valid = validData(gps.state, lastPoint)
    if(valid){
        //Approx 3 feet
        const loc = {
            lat: gps.state.lat,
            lon: gps.state.lon,
            speed: gps.state.speed,
            altitude: gps.state.alt,
            time: gps.state.time,
            synced: false,
            tripId: uuid,
            satsActive: gps.state.satsActive.length,
            hdop: gps.state.hdop
        }
        try{
            await docStore.addLocation(loc)
            lastPoint = {lat: loc.lat, lon: loc.lon, time:loc.time}
            console.log(lastPoint)
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

const syncdata = () =>{
    docStore.syncData()
}
//Start syncing data.
setInterval(syncdata, 30000)

syncdata()
