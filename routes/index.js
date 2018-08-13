/**
 * Created by aditya on 8/8/18.
 */
var express = require('express');
var router=express.Router();
var bcrypt=  require('bcryptjs');
var globals = require('./GlobalVariables')
var fs = require('fs');
var ejs = require('ejs');
var RegistrationModel = require('./CandidateRegistrationModel');
var pdf = require('html-pdf');

router.get('/',function(req,res,next){
    if(req.session.enrollment && req.session.type==globals.sessionType[0])
        res.redirect('candidate/'+req.session.enrollment);
    else res.render('login', {status: false});
});

router.get('/admitcard/:enroll',function(req,res,next){
    if(req.session.enrollment==req.params.enroll && req.session.type==globals.sessionType[0]){
        RegistrationModel.findOne({enrollment:req.session.enrollment},function (err,foundData) {
                if(foundData){
                    var template = fs.readFileSync(__dirname+'/../templates/admitcard.ejs',{encoding:'utf-8'});
                    var html = ejs.render(template,{
                        center:foundData.center,
                        firstname:foundData.firstname,
                        lastname:foundData.lastname,
                        email:foundData.email,
                        aadhaar:foundData.aadhaar,
                        dob:foundData.dob,
                        profile:foundData.profile,
                        enrollment:foundData.enrollment
                    });
                    pdf.create(html,{format: 'Letter'}).toBuffer(function(err, buffer){
                        res.type('pdf');
                        res.end(buffer, 'binary');
                    });
                }
        });
    }else{
        req.session.enrollment = false;
        req.session.type = false;
        res.render('login', {status: true,error:"Please enter credentials again to Download Admit Card.",prev:{}});
    }
});

router.get('/candidate/:enroll',function(req,res,next){
    if(req.session.enrollment==req.params.enroll && req.session.type==globals.sessionType[0]){
        RegistrationModel.findOne({enrollment:req.session.enrollment},function (err,foundData) {
            if(err){
                res.render('login',{status:true,error:err.message,prev:{}})
            }
            else{
                if(foundData){
                    res.render('candidateportal',{
                        status:true,
                        center:foundData.center,
                        firstname:foundData.firstname,
                        lastname:foundData.lastname,
                        email:foundData.email,
                        aadhaar:foundData.aadhaar,
                        dob:foundData.dob,
                        profile:foundData.profile,
                        enrollment:foundData.enrollment,
                        logs:foundData.logs.reverse()
                    });
                }
                else{
                    res.render('login',{status:true,error:"Please enter credentials again.",prev:{}})
                }
            }
        });
    }else{
        req.session.enrollment = false;
        req.session.type = false;
        res.render('login', {status: true,error:"Please enter credentials again.",prev:{}});
    }
});

router.get('/logout',function(req,res,next){
    req.session.enrollment = false;
    req.session.type = false;
    res.redirect('/');
});

router.post('/',function(req,res,next){
    RegistrationModel.findOne({email:req.body.email},function (err,foundData) {
        if(err){
            res.render('login',{status:true,error:err.message,prev:{}})
        }
        else{
            if(foundData) {
                bcrypt.compare(req.body.passwd, foundData.password, function (err, result) {
                    if (!result) {
                        res.render('login',{status:true,error:"Email or Password is not correct.",prev:req.body})
                    }
                    else {
                        req.session.enrollment = foundData.enrollment;
                        req.session.type = globals.sessionType[0];
                        res.redirect('/candidate/'+req.session.enrollment);
                    }
                });
            }
            else{
                res.render("login",{status:true,error:"Email or Password is not correct.",prev:req.body})
            }
        }
    });
});
module.exports = router;