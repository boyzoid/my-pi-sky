import common from 'oci-common';
import * as fn from "oci-functions";
import { Readable } from 'stream';

class FunctionsClient {
    #provider
    #client
    constructor(){
        this.#provider = new common.ConfigFileAuthenticationDetailsProvider()
        this.#client = new fn.FunctionsInvokeClient({ authenticationDetailsProvider: this.#provider })
        this.#client.endpoint = process.env.DATA_PUSH_ENDPOINT
    }

    async invoke(data) {
        const invokeRequest = {
            functionId: process.env.DATA_PUSH_FUNCTION_ID,
            invokeFunctionBody: this.generateStreamFromString(JSON.stringify(data)),
            fnIntent: fn.requests.InvokeFunctionRequest.FnIntent.Httprequest,
            fnInvokeType: fn.requests.InvokeFunctionRequest.FnInvokeType.Sync,
        }
        return await this.#client.invokeFunction(invokeRequest)
    }


    generateStreamFromString(data) {
        let stream = new Readable();
        stream.push(data); // the string you want
        stream.push(null);
        return stream;
    }
}

export default FunctionsClient