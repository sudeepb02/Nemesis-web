/**
 * Created by aditya on 8/9/18.
 */
var mongoose  = require('mongoose');var autoIncrement = require('mongoose-auto-increment');
var mongooseValidationErrorTransform = require('mongoose-validation-error-transform');
var globals = require('./GlobalVariables');
var uniqueValidator = require('mongoose-unique-validator');

mongoose.Promise = global.Promise;
var connection = mongoose.createConnection(globals.EXAMDB_URL,{ useNewUrlParser: true});
autoIncrement.initialize(connection);
mongoose.plugin(mongooseValidationErrorTransform, {
    capitalize: true,
    humanize: true,
    transform: function(messages) {
        return messages.join(', ');
    }
});

var invigilatorSchema = mongoose.Schema({
    firstname:{
        type:String,
        required:[true,"Please enter invigilator first-name"]
    },
    lastname:{
        type:String,
        required:[true,"Please enter invigilator last-name"]
    },
    invigilatorSecret:{
        type:String,
        default : function() {
            var text = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            for (var i = 0; i < 6; i++)
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            return text;
        }
    },
    email:{
        type:String,
        unique:[true,"Provided email already in use."],
        required:[true,"Please enter invigilator email."],
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address.']
    },
    aadhaar:{
        type:String,
        required:[true,"Please enter aadhaar number."],
        maxlength:[12,"Invalid aadhaar number."],
        minlength:[12,"Invalid aadhaar number."],
        unique:[true,"Aadhaar number already in use."]
    },
    center:{
        type:Number,
        required:[true,"Please specify a center for invigilator."]
    },
    profile:{
        type:String,
        required:false
    },
    logs:{
        type:Array,
        default : [globals.now()+" : Invigilator added."]
    }

},{strict:true});
invigilatorSchema.plugin(autoIncrement.plugin, {
    model: 'invigilators',
    field: 'id',
    startAt: 1010,
    incrementBy: 2
});
invigilatorSchema.plugin(uniqueValidator, { message: '{PATH} already in use.' });

var InvigilatorRegistrationModel = connection.model("invigilators",invigilatorSchema);
module.exports = InvigilatorRegistrationModel;