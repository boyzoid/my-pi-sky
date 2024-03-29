// importing the dependencies
import express from 'express'
import * as dotenv from 'dotenv'
dotenv.config()

// Document Store Service
import DocumentStore from "./DocumentStore.js"
import path from "path"
import MySQLChannelClient from "./MySQLChannelClient.js"
const docStore = new DocumentStore(
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    process.env.DB_HOST,
    process.env.DB_PORT,
    process.env.DB_SCHEMA,
    process.env.DB_COLLECTION
)

const mySqlChannelClient = new MySQLChannelClient()


// defining the Express app
const app = express()

// using bodyParser to parse JSON bodies into JS objects
app.use(express.json())
app.use(express.static(path.join('public')));

// starting the server
app.listen(process.env.PORT, () => {
    console.log('listening on port ' + process.env.PORT)
});

app.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

app.get('/api/dates', async (req, res) => {
    const dates = await docStore.getDates()
    let msg = {dates: dates}
    res.send(msg)
})

app.get('/api/points/:year/:month/:day', async (req, res) => {
    const data = {}
    data.points = await docStore.getPoints(req.params.year, req.params.month, req.params.day)
    data.avgSpeedK = round( data.points.reduce((val, item)=>val + item.speed, 0)/data.points.length)
    data.avgSpeedM = round( data.avgSpeedK * 0.6213711922)
    res.send(data)
})

app.get('/api/replica-status', async (req, res) => {
    const result = await mySqlChannelClient.getChannel(process.env.MYSQL_REPLICATION_CHANNEL_ID)
    const data = {channelName: result.channel.displayName, state: result.channel.lifecycleState}
    res.send(data)
})

const round = (val)=>{
    return Math.round(val * 10 ** 2)/10 ** 2
}