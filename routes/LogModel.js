/**
 * Created by aditya on 8/10/18.
 */
var mongoose  = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
var globals = require('./GlobalVariables');

mongoose.Promise = global.Promise;
var connection = mongoose.createConnection(globals.EXAMDB_URL,{ useNewUrlParser: true, poolSize: 4 });
autoIncrement.initialize(connection);

var logSchema = mongoose.Schema({
    dtime:{
        type:String,
        default:globals.now()
    },
    description:{
        type:String
    }
},{strict:true});

logSchema.plugin(autoIncrement.plugin, {
    model: 'logs',
    field: 'id',
    startAt: 1,
    incrementBy: 1
});

var LogModel = connection.model("logs",logSchema);
module.exports = LogModel;