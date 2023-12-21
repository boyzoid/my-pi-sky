import * as mysqlx from '@mysql/xdevapi'

class DocumentStore {
    #schemaName
    #collectionName
    #connectionUrl
    #pool
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

    async getDates(){
        const session = await this.#pool.getSession()
        const schema = session.getSchema(this.#schemaName)
        const collection = schema.getCollection(this.#collectionName)
        const result = await collection.find('time <= now()').
            fields([
                "date_format(time, '%a. %b. %e, %Y') as `full`",
                "year(time) as `year`",
                "month(time) as `month`",
                "day(time) as `day`"])
            .groupBy([
                "date_format(time, '%a. %b. %e, %Y')",
                "year(time)",
                "month(time)",
                "day(time)"])
            .sort([
                "year(time) desc",
                "month(time) desc",
                "day(time) desc"])
            .execute()
        const data = result.fetchAll()
        await session.close()
        return data
    }

    async getPoints(year, month, day){
        const session = await this.#pool.getSession()
        const schema = session.getSchema(this.#schemaName)
        const collection = schema.getCollection(this.#collectionName)
        const result = await collection.find(`
            year(time) = :year 
            and month(time) = :month 
            and day(time) = :day
            and speed/1.609344 > .75`
            )
            .bind({'year' : year})
            .bind({'month' : month})
            .bind({'day' : day})
            .fields([ 'lat', 'lon'])
            .sort(['time asc'])
            .execute()
        const data = result.fetchAll()
        await session.close()
        return data
    }
}
export default DocumentStore