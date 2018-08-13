/**
 * Created by aditya on 8/8/18.
 */
var express = require('express');
var router=express.Router();
var globals = require('./GlobalVariables');
var mongojs = require('mongojs');
var fileUpload = require('express-fileupload');
var path = require('path');
var db=mongojs(globals.EXAMDB_URL,['candidates','invigilators','logs']);
var RegistrationModel = require('./InvigilatorRegistrationModel');
router.use(fileUpload());

router.get('/',function(req,res,next){
    if(req.session.adminname && req.session.type==globals.sessionType[1])
        res.redirect('/adminlogin/'+req.session.adminname);
    else res.render('adminlogin', {status: false});
});

router.post('/addinvig',function(req,res,next){
    if(req.session.adminname && req.session.type==globals.sessionType[1]) {
        var invigilator = new RegistrationModel();
        invigilator.firstname = req.body.firstname;
        invigilator.lastname=req.body.lastname;
        invigilator.center=req.body.center;
        invigilator.aadhaar = req.body.aadhaar;
        invigilator.email = req.body.email;
        invigilator.profile = "profilephotos/"+req.body.aadhaar;

        //get profile photo object
        var profilephoto = req.files.profile;

        invigilator.save(function (err, savedObject) {
            if (err) {
                values = {status:true,error:err.message.split(','),prev:req.body,centerlist:globals.centers};
                db.candidates.find({},{password:0,logs:0,_id:0}).sort({enrollment:-1})
                    .limit(5,function (err,docs) {
                        values.candidates = docs;
                        db.invigilators.find({},{_id:0}).sort({id:-1})
                            .limit(10,function (err,docs) {
                                values.invigilators = docs;
                                db.logs.find({},{_id:0}).sort({id:-1})
                                    .limit(10,function (err,docs) {
                                        values.logs = docs;
                                        res.render('admin',values);
                                    });
                            });
                    });
            }
            else {
                profilephoto.mv(__dirname + "/../profilephotos/" + req.body.aadhaar, function (err) {
                    if (err) console.log("Upload failed : " + err);
                });
                values = {status:false,msg:"Invigilator added.",prev:req.body,centerlist:globals.centers};
                db.candidates.find({},{password:0,logs:0,_id:0}).sort({enrollment:-1})
                    .limit(5,function (err,docs) {
                        values.candidates = docs;
                        db.invigilators.find({},{_id:0}).sort({id:-1})
                            .limit(5,function (err,docs) {
                                values.invigilators = docs;
                                db.logs.find({},{_id:0}).sort({id:-1})
                                    .limit(10,function (err,docs) {
                                        values.logs = docs;
                                        res.render('admin',values);
                                    });
                            });
                    });
            }
        });
    }
    else res.render('adminlogin', {status: false});
});

router.get('/:adminname',function(req,res,next){
    if(req.session.adminname==req.params.adminname && req.session.type==globals.sessionType[1]){
        values = {status:false,msg:"",centerlist:globals.centers};
        db.candidates.find({},{password:0,_id:0}).sort({enrollment:-1})
            .limit(5,function (err,docs) {
                values.candidates = docs;
                db.invigilators.find({},{_id:0}).sort({id:-1})
                    .limit(5,function (err,docs) {
                        values.invigilators = docs;
                        db.logs.find({},{_id:0}).sort({id:-1})
                            .limit(10,function (err,docs) {
                                values.logs = docs;
                                res.render('admin',values);
                            });
                    });
            });
    }else{
        req.session.adminname = false;
        req.session.type = false;
        res.render('adminlogin', {status: true,error:"Please enter crendentials again.",prev:{}});
    }
});

router.get('/adminlogin/logout',function(req,res,next){
    req.session.adminname = false;
    req.session.type = false;
    res.redirect('/adminlogin');
});

router.post('/',function(req,res,next){
    if(req.body.name=="admin" && req.body.passwd=="admin"){
        req.session.adminname = req.body.name;
        req.session.type = globals.sessionType[1];
        res.redirect('/adminlogin/'+req.session.adminname)
    }else{
        res.render('adminlogin', {status: true,error:"Invalid credentials. Try Again",prev:req.body});
    }
});
module.exports = router;