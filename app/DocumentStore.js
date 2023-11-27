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
            `mysqlx://${dbUser}:${dbPassword}@${dbHost}:${dbPort}}/${schemaName}`
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

    async getMonths(){
        const session = await this.#pool.getSession()
        const schema = session.getSchema(this.#schemaName)
        const collection = schema.getCollection(this.#collectionName)
        const result = await collection.find().
            fields([
                "date_format(time, '%M %Y') as `full`",
                "year(time) as `year`",
                "month(time) as `month`"])
            .groupBy([
                "date_format(time, '%M %Y')",
                "year(time)",
                "month(time)"])
            .sort([
                "year(time) desc",
                "month(time) desc"])
            .execute()
        const data = result.fetchAll()
        await session.close()
        return data
    }

    async getDates(year, month){
        const session = await this.#pool.getSession()
        const schema = session.getSchema(this.#schemaName)
        const collection = schema.getCollection(this.#collectionName)
        const result = await collection.find("year(time) = :year and month(time) = :month")
            .bind("year", year)
            .bind("month", month)
            .fields(["json_arrayagg(date_format(time, '%d')) as days"])
            .groupBy("date_format(time, '%d')")
            .execute()
        const data = result.fetchAll()
        await session.close()
        return data
    }
}
export default DocumentStore