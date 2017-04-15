const bossIDs = ['302448950240215040', '257090675319767040'] // only these can command the bot
const bossNames = [] // only these can command the bot

const moment = require('moment')

const Agenda = require('agenda')
const agenda = new Agenda({
  db: {address: process.env.MONGO_CONNECTION_STRING},
  processEvery: '30 minutes'
});

const Discord = require('discord.io');
const bot = new Discord.Client({
    autorun: true,
    token: process.env.BOT_TOKEN
});

let getAGreeting = function(user) {
  let greetings = [
    "Wohoo!! Happy Birthday!!",
    "Wish You Many Happy Returns of this Day...",
    "Best Wishes for your Birthday! Now where's that Cake, buddy?",
    "May this be Yet Another Happy & Prosperous Year!",
    "Wish You a Great Year Ahead! Have a Blast!"
  ]
  return `@${user} ${greetings[Math.floor(Math.random()*greetings.length)]}`
}

let sendBirthdayMsg = function(user, channelID) {
    bot.sendMessage({
      to: channelID,
      message: getAGreeting(user)
  });
}

let scheduleWish = function(whoseBirthday, whenBirthday, channelID) {
  agenda
  .create('send birthday wish', {whoseBirthday, channelID})
  .schedule(whenBirthday)
  .repeatEvery('1 year')
  .save()
}

agenda.define('send birthday wish', function(job, done) {
  let data = job.attrs.data;
  sendBirthdayMsg(data.whoseBirthday, data.channelID)
  done()
});

agenda.on('ready', function() {
  console.log("Agenda Started...............")
  // agenda.every('1 minutes', 'send birthday wish');
  agenda.start();
});

function graceful() {
  agenda.stop(function() {
    process.exit(0);
  });
}
process.on('SIGTERM', graceful);
process.on('SIGINT' , graceful);


bot.on('ready', function(event) {
    console.log('Logged in as %s - %s\n', bot.username, bot.id);
});

bot.on('message', function(user, userID, channelID, message, event) {
  // console.log(user)
  // console.log(userID)
  // console.log(channelID)
  // console.log(message)
  // console.log(event)

  if (!message.includes(`<@${bot.id}>`)) return // ignore msgs not aimed at the bot

  let botSays = ''
  if (bossIDs.indexOf(userID) >= 0 || bossNames.indexOf(user)) { // user can command bot

    let cleanedMsg = message.replace(`<@${bot.id}>`,'').replace(/ +(?= )/g,'').trim()
    // parse the msg for command
    // Format expected: <username> <birthday as YYYY-MM-DD>
    let whoseBirthday = cleanedMsg.split(' ')[0]
    let whenBirthday = cleanedMsg.split(' ')[1]
    let whenBirthdayMoment = moment(whenBirthday, ['MM-DD','DD/MM'])
    if ( !whenBirthdayMoment.isValid() ) {
      botSays = `@${user} Sorry Boss, I dint get what you just said!`
    } else {
      if ( whenBirthdayMoment.isBefore(moment(), 'days') ) { // b'day is in past, except Today
        whenBirthdayMoment.add(1, 'year') // no belated wishes; see you next year
      }
      scheduleWish(whoseBirthday, whenBirthdayMoment.toDate(), channelID)
      botSays = `@${user} OK Boss! I'll wish "${whoseBirthday}" every year on ${whenBirthdayMoment.format("Do MMMM")}!`
    }

  } else {
    botSays = `@${user}  You Ain't My Master!`
  }

  bot.sendMessage({
    to: userID,
    message: botSays
  })  
});