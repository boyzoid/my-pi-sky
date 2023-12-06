// importing the dependencies
import express from 'express'
import * as dotenv from 'dotenv'
dotenv.config()

// Document Store Service
import DocumentStore from "./DocumentStore.js";
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

// starting the server
app.listen(process.env.PORT, () => {
    console.log('listening on port ' + process.env.PORT)
});

app.get('/months', async (req, res) => {
    const months = await docStore.getMonths()
    let msg = {months: months}
    res.send(msg)
})

app.get('/dates/:year/:month', async (req, res) => {
    const days = await docStore.getDates(req.params.year, req.params.month)
    let msg = {days: days}
    res.send(msg)
})