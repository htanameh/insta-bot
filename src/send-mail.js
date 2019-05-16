const mailgun = require("mailgun-js");
const mg = mailgun({ apiKey: process.env.mailgunapi, domain: "sandbox94d7f787fc234fc7a0404701a6bdc6c8.mailgun.org" });
let logger = require('../log/logger');

function sendCompletionMail(to, pageName, startDate, startTime, totalLikes, totalComments, totalFollows){
    const data = {
        from: 'toddchavez@toddtheinstabot.com',
        to,
        subject: 'Todd the Insta-Bot has done the job!! Check the results',
        template: "sample",
        "v:pageName": pageName,
        "v:startDate": startDate,
        "v:startTime": startTime,
        "v:totalLikes": totalLikes,
        "v:totalComments": totalComments,
        "v:totalFollows": totalFollows
    };
    mg.messages().send(data, function (error, body) {
        if(!error){
            logger.info(`Mail sent successfully... ${body}`);
        }else{
            logger.error(`Error in sending mail... ${error}`);
        }
    });
}

function sendStartMail(to, pageName, startDate, startTime){
    const data = {
        from: 'toddchavez@toddtheinstabot.com',
        to,
        subject: 'Todd the Insta-Bot has started the job!',
        template: "start",
        "v:pageName": pageName,
        "v:startDate": startDate,
        "v:startTime": startTime,
    };
    mg.messages().send(data, function (error, body) {
        if(!error){
            logger.info(`Mail sent successfully... ${body}`);
        }else{
            logger.error(`Error in sending mail... ${error}`);
        }
    });
}

module.exports.sendStartMail = sendStartMail;
module.exports.sendCompletionMail = sendCompletionMail;