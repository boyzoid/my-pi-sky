// importing the dependencies
import express from 'express'
import * as dotenv from 'dotenv'
dotenv.config()

// Document Store Service
import DocumentStore from "./DocumentStore.js";
import path from "path";
const docStore = new DocumentStore(
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    process.env.DB_HOST,
    process.env.DB_PORT,
    process.env.DB_SCHEMA,
    process.env.DB_COLLECTION
);


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
    const points = await docStore.getPoints(req.params.year, req.params.month, req.params.day)
    let msg = {points: points}
    res.send(msg)
})