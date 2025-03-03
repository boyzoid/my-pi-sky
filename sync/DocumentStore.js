import * as mysqlx from '@mysql/xdevapi'
import FunctionsClient from "./FunctionsClient.js"

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
        this.#functionsClient =new FunctionsClient()
    }

    async getUnsyncedLocations(){
        const session = await this.#pool.getSession()
        const schema = session.getSchema(this.#schemaName)
        const collection = schema.getCollection(this.#collectionName)
        const result = await collection.find('synced = :syncedParam')
            .bind('syncedParam', false)
            .limit(500)
            .execute()
        const data = result.fetchAll()
        await session.close()
        return data
    }

    async syncData(){
        console.log("Starting sync")
        const session = await this.#pool.getSession()
        await session.close()
        try{
            const locs = await this.getUnsyncedLocations()
            console.log(`Syncing ${locs.length} points`)
            const result = await this.#functionsClient.invoke(locs)
            const data = await new Response(result.value).text()
            const newLocs = JSON.parse(data).results
            const ids = newLocs.map(trip =>{
                if (trip.synced){
                    return trip._id
                }
                else return null
            })

            if(ids.length > 0){
                const idStr = ids.map(item => `'${item}'`).join(",")
                const session = await this.#pool.getSession()
                const sql = `update location set doc = json_set(doc, "$.synced", true) where doc->>'$._id' in (${idStr})`
                await session.sql(sql).execute()
                session.close()
            }
            console.log("sync complete")
        }
        catch (e){
            console.log('Server seems to be off line.')
            console.log(e)
        }

    }
}
export default DocumentStore