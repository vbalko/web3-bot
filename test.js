const  { config } = require('./util/store');

config.initialize();

const bot1 = config.addNewBot('bot1','adr1');

bot1.data.cBot.setSMSId('+421 724 158 586');
bot1.data.cBot.setSendSMS(true);
bot1.data.save(bot1.data.cBot.data);

