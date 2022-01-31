import { Bot } from './bot';
import { CovalentAPI } from '../util/covalentapi';
import { TarotUtils } from '../util/tarot/tarotUtils'

class tarotBot extends Bot {
    constructor() {
        super();
        this.provider = "";
    }

    readConfig() {

    }

    async getCollateralVaults() {
        const address = this.provider.address;
        const records = await CovalentAPI.getBalances(address);
        const tarotRecords = records.items.filter(item => item.contract_ticker_symbol == 'cTAROT');
    }

    async getVault


}