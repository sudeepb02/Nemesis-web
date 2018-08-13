/**
 * Created by aditya on 8/9/18.
 */
var mongoose  = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
var globals = require('./GlobalVariables');
var mongooseValidationErrorTransform = require('mongoose-validation-error-transform');
var uniqueValidator = require('mongoose-unique-validator');

mongoose.plugin(mongooseValidationErrorTransform, {
    capitalize: true,
    humanize: true,
    transform: function(messages) {
        return messages.join(', ');
    }
});
mongoose.Promise = global.Promise;
var connection = mongoose.createConnection(globals.EXAMDB_URL,{ useNewUrlParser: true, poolSize: 4 });
autoIncrement.initialize(connection);
var candidateSchema = mongoose.Schema({
    firstname:{
        type:String,
        required: [true, "Please enter your firstname."]
    },
    lastname:{
        type:String,
        required: [true,"Please enter your lastname."]
    },
    email:{
        type:String,
        required:[true,"Please enter email address."],
        unique: [true, "Email already in use."],
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address.']
    },
    password:{
        type:String,
        required:[true,"Please enter password."]
    },
    aadhaar:{
        type:String,
        required:[true,"Please enter aadhaar number."],
        maxlength:[12,"Invalid aadhaar number."],
        minlength:[12,"Invalid aadhaar number."],
        unique:[true,"Aadhaar number already in use."]
    },
    profile:{
        type:String,
        required:false
    },
    dob:{
        type:String,
        required:[true,"Birth-date is required for registration."]
    },
    center:{
        type:Number,
        default: globals.centers[Math.floor(Math.random()*globals.centers.length)]
    },
    status:{
        type:String,
        default: "UNKNOWN"
    },
    attempts:{
        type:Number,
        default: 0
    },
    logs:{
        type:Array,
        default : [globals.now()+" : Candidate Registered."]
    }

},{strict:true});
candidateSchema.plugin(autoIncrement.plugin, {
    model: 'candidates',
    field: 'enrollment',
    startAt: 8900122,
    incrementBy: 3
});
candidateSchema.plugin(uniqueValidator, { message: '{PATH} already in use.' });
var CandidateRegistrationModel = connection.model("candidates",candidateSchema);
module.exports = CandidateRegistrationModel;