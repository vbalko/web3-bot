const nconf = require('nconf');
const _ = require('lodash');
const {
  ConfigStoreError,
  errorCodes
} = require('./customError');

const cfgName = 'botConfig';

class Config {
  constructor(confFile = './botConfig.json') {

    this.dirty = false;
    nconf.use(cfgName, {
      type: 'file',
      file: confFile
    });
    this.load(); // read to memory
  }
  /**
   * Initialize basic structure of config file with initial values
   *
   * @memberof Config
   */
  initialize() {
    if (this.isInitial()) {
      nconf.set(`${cfgName}:bots`, {});
      this.save();
    }
  }

  load() {
    nconf.load();
    this.dirty = false;
  }

  reload() {
    if (this.dirty) {
      this.load();
    }
  }

  save() {
    // nconf.save(function (err) {
    //   if (err) {
    //     console.log(err.message);
    //     return;
    //   }

    //   console.log('Configuration saved succesfully.');
    // });
    nconf.save();
  }

  isInitial() {
    const cfg = nconf.get(cfgName);
    if (!cfg) {
      return true;
    }
    const aKeys = Object.keys(cfg);
    if (!aKeys.length) {
      return true;
    }
  }
  /**
   * Finds new ID for bot
   *
   * @return {number} 
   * @memberof Config
   */
  getNewBotId() {
    this.initialize();
    const oBots = nconf.get(`${cfgName}:bots`)
    const aBots = Object.keys(oBots);
    const newBotId = aBots.length + 1;
    return newBotId;
  }

  addNewBot(name, address) {
    const newId = this.getNewBotId();
    const cBot = new BotConfig();
    cBot.initBot({
      name,
      address
    });
    nconf.set(`${cfgName}:bots:${newId}`, cBot.data);

    // const bots = nconf.get(`${cfgName}:bots`);
    // bots[newId] = cBot.data;
    // nconf.set('botConfig:bots',bots);
    nconf.save();
    return {
      id: newId,
      data: this.getBotData(newId)
    };
  }

  getBotData(botId) {
    const bot = nconf.get(`${cfgName}:bots:${botId}`);
    const cBot = new BotConfig();
    cBot.setBotData(bot, true);
    return {
      cBot,
      save: (botData) => {
        nconf.set(`${cfgName}:bots:${botId}`, cBot.data);
        nconf.save();
      }
    };
  }

  setSMS(botId, use, phone) {
    const cBot = this.getBotData(botId).cBot;
    cBot.setSMSId(phone);
    cBot.setSendSMS(use);
    nconf.set(`${cfgName}:bots:${botId}`, cBot.data);
  }


}
/**
 * Representation of Bot data from config db
 *
 * @class BotConfig
 */
class BotConfig {
  /**
   * Creates an instance of BotConfig.
   * @memberof BotConfig
   */
  constructor() {
    this.data = {};
    // this.initBot();

    this.initialized = false;
    this.initialData = true;
  }
  /**
   * Returns true if sending SMS is allowd and set
   *
   * @return {boolean} 
   * @memberof BotConfig
   */
  canSendSMS() {
    try {
      this.checkSMSPrerequisities();
      if (this.data.alerts.sendSMS) {
        return true;
      }
    } catch (err) {
      this.logError(err.message, 'canSendSMS', false, args);
    }
  }

  /**
   * Returns true if sending Email is allowd and set
   *
   * @return {boolean} 
   * @memberof BotConfig
   */
  canSendEmail() {
    try {
      this.checkEmailPrerequisities();
      if (this.data.alerts.sendEmail) {
        return true;
      }
    } catch (err) {
      this.logError(err.message, 'canSendEmail', false, args);
    }
  }

  /**
   * Sets new bot data. If data was already set before (not initial),
   * force = true must be set
   *
   * @param {object} data
   * @param {boolean} [force=false]
   * @return {{ok:boolean}} 
   * @memberof BotConfig
   */
  setBotData(data, force = false) {
    const ret = {
      ok: false
    }
    try {
      //set data only if 
      if (this.initialData || force) {
        this.data = data;
      }
      this.checkBotCorePrerequisities();
      this.initialData = false;
      ret.ok = true;
    } catch (err) {

    }
    return ret;
  }

  /**
   * Initialize empty bot structure
   * Usually this structure is replaced by actual bot data by calling setBotData
   * @param {{name:string, address:string}} data
   * @param {boolean} [force=false]
   * @memberof BotConfig
   */
  initBot(data, force = false) {
    try {
      const {
        name,
        address
      } = data;
      if (_.isEmpty(this.data) || force) {
        this.data = {
          name: name,
          address: address,
        };
        this.initAlerts(true);
      }
      this.initialized = true;
      this.initialData = false;
    } catch (err) {
      const args = {
        status: errorCodes.GENERAL_ERROR,
        prev: err
      };
      this.logError('Error initializing bot', 'initBot', true, args);
    }

  }
  /**
   * Initializes alerts structure of botConfig
   * sets false to sendSMS and sendEmail to prevent unnecesary cost
   * @param {boolean} [force=false]
   * @memberof BotConfig
   */
  initAlerts(force = false) {
    if (!this.data.alerts || force) {
      this.data.alerts = {
        count: 0,
        smsCount: 0,
        emailCount: 0,
        last: {
          emailText: 'initText',
          smsText: 'initText',
          timestamp: new Date(0).toString(),
        },
        sms: '',
        email: '',
        sensitivityLevel: 5, //1-5 according to tarot safety levels (green - red)
        sendSMS: false,
        sendEmail: false
      };
    }
  }

  setSMSId(smsId) {
    this.initAlerts();
    try {
      this.data.alerts.sms = smsId;
    } catch (err) {
      const args = {
        status: errorCodes.GENERAL_ERROR,
        prev: err
      };
      this.logError('Error setting sendSMS', 'setSMSId', true, args);
    }
  }

  setEmailId(emailId) {
    this.initAlerts();
    try {
      this.data.alerts.email = emailId;
    } catch (err) {
      const args = {
        status: errorCodes.GENERAL_ERROR,
        prev: err
      };
      this.logError('Error setting sendSMS', 'setEmailId', true, args);
    }
  }
  /**
   * Set sensitivity level 
   * This value sets Tarot riskLevel on which alert is triggered
   * @param {String} sLevel 1 - 5
   * @memberof BotConfig
   */
  setSensitivityLevel(sLevel) {
    this.initAlerts();
    try {
      this.data.alerts.email = emailId;
    } catch (err) {
      const args = {
        status: errorCodes.GENERAL_ERROR,
        prev: err
      };
      this.logError('Error setting sendSMS', 'setEmailId', true, args);
    }
  }

  setSendSMS(state) {
    this.initAlerts();
    try {
      this.checkSMSPrerequisities();
      this.data.alerts.sendSMS = state;
    } catch (err) {
      if (err.status == errorCodes.SMS_CONFIG_ERROR) {
        const args = {
          status: errorCodes.SMS_CONFIG_ERROR,
          prev: err
        };
        this.logError(`SMS not configured properly on ${this.data.name}`, 'setSendSMS', true, args);
      }
      const args = {
        status: errorCodes.GENERAL_ERROR,
        prev: err
      };
      this.logError('Error setting sendSMS', 'setSendSMS', true, args);
    }
  }

  setSendEmail(state) {
    this.initAlerts();
    try {
      this.checkEmailPrerequisities();
      this.data.alerts.sendEmail = state;
    } catch (err) {
      if (err.status == errorCodes.EMAIL_CONFIG_ERROR) {
        const args = {
          status: errorCodes.EMAIL_CONFIG_ERROR,
          prev: err
        };
        this.logError(`Email not configured properly on ${this.data.name}`, 'setSendEmail', true, args);
      }
      const args = {
        status: errorCodes.GENERAL_ERROR,
        prev: err
      };
      this.logError('Error setting sendEmail', 'setSendEmail', true, args);
    }
  }

  checkSMSPrerequisities() {
    this.initAlerts();
    if (!this.data.alerts.sms) {
      const args = {
        status: errorCodes.SMS_CONFIG_ERROR,
        prev: undefined
      };
      this.logError('SMS not configured properly', 'checkSMSPrerequisities', true, args);
    }
    return true;
  }

  checkEmailPrerequisities() {
    this.initAlerts();
    if (!this.data.alerts.email) {
      const args = {
        status: errorCodes.EMAIL_CONFIG_ERROR,
        prev: undefined
      };
      this.logError('Email not configured properly', 'checkEmailPrerequisities', true, args);
    }
    return true;
  }
  /**
   * Checks if all manadatory parameters are set
   *
   * @memberof BotConfig
   */
  checkBotCorePrerequisities() {
    if (!(this.data.name && this.data.address)) {
      const args = {
        status: errorCodes.GENERAL_ERROR,
        prev: undefined
      };
      this.logError('Name and address parameters are mandatory', 'checkBotCorePrerequisities', true, args);
    }
    return true;
  }

  handleAlertSent(alertData = {
    sms: true,
    email: true,
    smsText: 'text',
    emailText: 'text'
  }) {
    this.addAlertCounts(alertData);
    const alerts = this.data.alerts;
    alerts.last = {
      emailText: alertData.emailText,
      smsText: alertData.smsText,
      timestamp: Date().toString()
    }
  }

  addAlertCounts(alertData = {
    sms: true,
    email: true
  }) {
    const {
      sms,
      email
    } = alertData;
    const alerts = this.data.alerts;
    alerts.count += 1;
    if (sms) alerts.smsCount += 1;
    if (email) alerts.emailCount += 1;
  }

  addCheckAddress(address) {

  }

  logError(msg, method, _throw = false, {
    status,
    prev
  } = {
    status: 0,
    prev: undefined
  }) {
    const errmsg = `ERR: ${this.constructor.name}/${method} <<< ${msg}`;
    console.log(errmsg);
    if (_throw) {
      throw new ConfigStoreError(status, prev, errmsg);
    }
  }
}


const sample = {
  bots: {
    1: {
      name: 'botName',
      address: 'walletAddress',
      alerts: {
        count: 5,
        smsCount: 5,
        emailCount: 5,
        last: {
          emailText: 'Your vault SpiritSwap Vault FTM/TAROT on Wallet <walletAddress> TWAP 1.456 - limit prices 0.9221 - 3.2522',
          smsText: 'FTM/TAROT 1.456',
          timestamp: 'Mon Jan 31 2022 18:11:57 GMT+0100',
        },
        sms: '+421 724 158 586',
        email: 'vbalko@gmail.com',
        sensitivityLevel: 5, //1-5 according to tarot safety levels (green - red)
        sendSMS: true,
        sendEmail: true
      }
    }
  }
}

module.exports = {
  config: new Config()
}

//const errorCodes = ec.configStore;
// export const config = new Config();
