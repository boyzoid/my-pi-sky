import common from 'oci-common';
import * as mysql from "oci-mysql";

class MySQLChannelClient {
    #provider
    #channelClient
    constructor(){
        this.#provider = new common.ConfigFileAuthenticationDetailsProvider();
        this.#channelClient = new mysql.ChannelsClient({ authenticationDetailsProvider: this.#provider })
    }

    async getChannel(id){
        const channelReq = {channelId: id}
        const channel = await this.#channelClient.getChannel(channelReq);
        return channel;
    }
}

export default MySQLChannelClient