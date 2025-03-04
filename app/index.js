// importing the dependencies
import express from 'express'
import * as dotenv from 'dotenv'
dotenv.config()

// Document Store Service
import DocumentStore from "./DocumentStore.js"
import path from "path"
const docStore = new DocumentStore(
    process.env.SPS_DB_USER,
    process.env.SPS_DB_PASSWORD,
    process.env.SPS_DB_HOST,
    process.env.SPS_DB_PORT,
    process.env.SPS_DB_SCHEMA,
    process.env.SPS_DB_COLLECTION
)

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
    const headers = req.headers
    const offset = headers['tz'] ? headers['tz'] : 'UTC';
    const dates = await docStore.getDates(offset)
    let msg = {dates: dates}
    res.send(msg)
})

app.get('/api/trips/:year/:month/:day', async (req, res) => {
    const headers = req.headers
    const offset = headers['tz'] ? headers['tz'] : 'UTC';
    const data = {}
    data.trips = await docStore.getTrips(req.params.year, req.params.month, req.params.day, offset)
    res.send(data)
})

app.get('/api/trip/:id', async (req, res) => {
    const data = {}
    data.points = await docStore.getTrip(req.params.id)
    res.send(data)
})

app.get('/api/delete/:id', async (req, res) => {
    const ret = await docStore.deleteTrip(req.params.id)
    res.send(ret)
})


const round = (val)=>{
    return Math.round(val * 10 ** 2)/10 ** 2
}