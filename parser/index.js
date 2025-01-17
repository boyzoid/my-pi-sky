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
let lastPoint = {}

console.log('App started')

gps.on('data', async ()=>{
    const distance = lastPoint.lat && (gps.state.lat && gps.state.lon)  ? GPS.Distance(lastPoint.lat, lastPoint.lon, gps.state.lat, gps.state.lon) : 0
    lastPoint = {lat: gps.state.lat, lon: gps.state.lon}
    if(distance > 0.001){
        //Approx 5.25 feet
        const loc = {
            lat: gps.state.lat,
            lon: gps.state.lon,
            speed: gps.state.speed,
            altitude: gps.state.alt,
            time: gps.state.time,
            synced: false,
            tripId: uuid
        }
        console.log(distance)
        try{
            await docStore.addLocation(loc)
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
