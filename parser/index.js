import { SerialPort } from "serialport"
import { ReadlineParser } from '@serialport/parser-readline'
import GPS from "gps"
import * as dotenv from 'dotenv'
import { setTimeout } from 'timers/promises'
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

const port = new SerialPort({path: '/dev/ttyUSB0', baudRate: 9600})
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }))
const gps = new GPS
let startDate = new Date()
startDate.setMinutes(startDate.getMinutes() - 1)
let lastPoint = {lat: 0, lon: 0};

console.log('App started')

gps.on('data', async ()=>{
    const diff = Math.abs(startDate - gps.state.time)
    const sec = Math.floor((diff))
    const dist = GPS.Distance(lastPoint.lat, lastPoint.lon, gps.state.lat, gps.state.lon)
    if(sec > 15000 && gps.state.lat && gps.state.lon && dist > 0.002){
        startDate = gps.state.time
        lastPoint = {lat: gps.state.lat, lon: gps.state.lon}
        const loc = {
            lat: gps.state.lat,
            lon: gps.state.lon,
            speed: gps.state.speed,
            altitude: gps.state.alt,
            time: gps.state.time
        }
        try{
            console.log(loc)
            //await docStore.addLocation(loc)
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
    }
})
