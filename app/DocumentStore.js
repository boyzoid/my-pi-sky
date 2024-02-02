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
                "year(convert_tz(time, 'UTC', 'UTC')) as `year`",
                "month(convert_tz(time, 'UTC', 'UTC')) as `month`",
                "day(convert_tz(time, 'UTC', 'UTC')) as `day`"])
            .groupBy([
                "year(convert_tz(time, 'UTC', 'UTC'))",
                "month(convert_tz(time, 'UTC', 'UTC'))",
                "day(convert_tz(time, 'UTC', 'UTC'))"])
            .sort([
                "year(convert_tz(time, 'UTC', 'UTC')) desc",
                "month(convert_tz(time, 'UTC', 'UTC')) desc",
                "day(convert_tz(time, 'UTC', 'UTC')) desc"])
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
            year(convert_tz(time, 'UTC', 'UTC')) = :year 
            and month(convert_tz(time, 'UTC', 'UTC')) = :month 
            and day(convert_tz(time, 'UTC', 'UTC')) = :day`
            )
            .bind({'year' : year})
            .bind({'month' : month})
            .bind({'day' : day})
            .fields([ 'lat', 'lon', 'speed', 'altitude'])
            .sort(['time asc'])
            .execute()
        const data = result.fetchAll()
        await session.close()
        return data
    }
}
export default DocumentStore