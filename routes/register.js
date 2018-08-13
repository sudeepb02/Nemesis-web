/**
 * Created by aditya on 8/8/18.
 */
var express = require('express');
var router=express.Router();
var bcrypt=  require('bcryptjs');
var fileUpload = require('express-fileupload');
var path = require('path');
var globals = require('./GlobalVariables');
var RegistrationModel = require('./CandidateRegistrationModel');
router.use(fileUpload());

router.get('/',function(req,res,next){
    if(req.session.enrollment && req.session.type==globals.sessionType[0])
        res.redirect('/candidate/'+req.session.enrollment);
    else {
        if (globals.REGISTRATION_OPEN) res.render('register', {status: false, msg: ""});
        else res.render('register',{status:true,error:["Registrations are closed!!!"],prev:{}})

    }
});

router.post('/',function(req,res,next){
    //use mongoose
    if (!globals.REGISTRATION_OPEN) {
        res.render('register',{status:true,error:["Sorry!!!, We are not accepting new applications.","Registrations are closed!!!"],prev:{}});
        return;
    }

    var candidate = new RegistrationModel();
    candidate.firstname = req.body.firstname;
    candidate.lastname = req.body.lastname;
    candidate.email = req.body.email;
    candidate.aadhaar = req.body.aadhaar;
    candidate.dob = req.body.dob;

    if((req.body.passwd != req.body.passwd2) || req.body.passwd.length < 5 ){
        res.render('register', {status: true,error: ["Passwords too small or do not match."],prev:req.body});
        return;
    }

    //get profile photo object
    var profilephoto = req.files.profile;

    //generate hash from password
    bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(req.body.passwd, salt, function (err, hash) {
            candidate.password = hash;
            candidate.profile = "profilephotos/"+req.body.aadhaar;
            candidate.save(function (err, savedObject) {
                if (err) {
                    res.render('register', {status: true,error: err.message.split(','),prev:req.body});
                }
                else {
                    profilephoto.mv(__dirname +"/../profilephotos/"+req.body.aadhaar, function(err) {
                        if (err) console.log("Upload failed : "+err);
                    });
                    req.session.enrollment = savedObject.enrollment;
                    req.session.type = globals.sessionType[0];
                    res.render('register', {status: false,msg: "You have Been Registered"});
                }
            });
        });
    });
});

module.exports = router;