import * as mysqlx from '@mysql/xdevapi'

class DocumentStore {
    #schemaName
    #collectionName
    #connectionUrl
    #pool
    #functionsClient
    constructor(dbUser, dbPassword, dbHost, dbPort, schemaName, collectionName) {
        this.#schemaName = schemaName
        this.#collectionName = collectionName
        this.#connectionUrl =
            `mysqlx://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${schemaName}`
        this.#pool = mysqlx.getClient(this.#connectionUrl, {
            pooling: {
                enabled: true,
                maxSize: 10,
                maxIdleTime: 20000,
                queueTimeout: 5000
            }
        })
    }

    async addLocation(location){
        const session = await this.#pool.getSession()
        const schema = session.getSchema(this.#schemaName)
        const collection = schema.getCollection(this.#collectionName)
        await collection.add(location).execute()
        await session.close()
    }

    async getDates(tz){
        const session = await this.#pool.getSession()
        const sql = `select distinct 
                            date_format(min(convert_tz(doc->>'$.time', 'UTC','${tz}')), '%Y-%m-%dT00:00:00') as date
                            from location
                            group by doc->>'$.tripId'
                            order by date`
        try{
            const results = await session.sql(sql).execute()
            const dates = results.fetchAll()
            const ret = []
            for (const dt of dates){
                ret.push(dt[0])
            }
            session.close()
            return ret
        }
        catch(err){
            console.log(err)
            return []
        }
    }

    async getTrips(year, month, day, tz){
        const session = await this.#pool.getSession()
        const sql = `with trips as (
                select doc->>'$.tripId' tripId,
                       min(convert_tz(doc->>'$.time', 'UTC', '${tz}')) tripStart,
                       max(convert_tz(doc->>'$.time', 'UTC', '${tz}')) tripEnd
                from location
                group by tripId
                )
                select tripId, 
                       date_format(tripStart, '%a, %b %e - %l:%i:%S %p'), 
                       date_format(tripEnd, '%a, %b %e - %l:%i:%S %p')
                from trips
                where
                year(tripStart) = ?
                and month(tripStart) = ?
                and day(tripStart) = ?
                order by tripStart`
        try{
            const results = await session.sql(sql).bind(year).bind(month).bind(day).execute()
            const trips = results.fetchAll()
            const ret = []
            for (const [idx, trip] of trips.entries()){
                const theTrip = {
                    name: `Trip ${idx + 1}`,
                    id: trip[0],
                    tripStart: trip[1],
                    tripEnd: trip[2],
                }
                ret.push(theTrip)
            }
            session.close()
            return ret
        }
        catch(err){
            console.log(err)
            return []
        }

    }

    async getTrip(tripId){
        const session = await this.#pool.getSession()
        const schema = session.getSchema(this.#schemaName)
        const collection = schema.getCollection(this.#collectionName)
        const result = await collection.find('tripId = :tripIdParam')
            .bind('tripIdParam', tripId)
            .fields([ 'lat', 'lon'])
            .sort(['time asc'])
            .execute()
        const data = result.fetchAll()
        await session.close()
        return data
    }

    async deleteTrip(tripId){
        const ret = {success: true}
        const session = await this.#pool.getSession()
        const schema = session.getSchema(this.#schemaName)
        const collection = schema.getCollection(this.#collectionName)
        try{
            await collection.remove("tripId = :tripIdParam").bind('tripIdParam', tripId).execute()
        }
        catch (err){
            ret.success = false
        }
        return ret
    }
}
export default DocumentStore