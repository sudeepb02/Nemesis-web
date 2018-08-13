/**
 * Created by aditya on 8/9/18.
 */
var datetime = require('node-datetime');
var GlobalVariables = {
    centers : [106523,106524,206537,406538,456267,456268],
    sessionType : ['candidate','admin'],
    now: function(){
        var unixtimestamp = datetime.create();
        return unixtimestamp.format('d/m/Y I:M:S p')
    },
    EXAMDB_URL : "mongodb://nemesis:nemesis-dev01@ds217002.mlab.com:17002/exam",
    AGENT_SECRET : "nemesis-dev01-dbtandroid",
    AGENT : "android",
    JWT_SECRET : "nemesis-dev01-dbt@jwttoken#secret",
    JWT_TOKEN_VALIDATION_DURATION : 60*60*3, //token expires in 3 hours(duration of exam),
    REGISTRATION_OPEN : true,
    API_OPEN : true

};
module.exports = GlobalVariables;