/**
 * Created by aditya on 8/9/18.
 */
var express = require('express');
var router=express.Router();
var globals = require('./GlobalVariables');
var mongojs = require('mongojs');
var jwt = require('jsonwebtoken');
var logModel = require('./LogModel')
var db=mongojs(globals.EXAMDB_URL,['candidates','invigilators','logs']);

function addLog(description) {
    var log = new logModel();
    log.description = description;
    log.save(function (err, savedObject){
        if (err) console.log(err.message);
    });
    return;
}

function addCandidateLog(enrollment,description){
    ndescription = globals.now()+" : "+description;
    db.candidates.update({enrollment:enrollment},{$push : { logs : ndescription }},function(err,doc){
        if(err) console.log(err.message);
    });
}

function addInvigilatorLog(id,description){
    ndescription = globals.now()+" : "+description;
    db.invigilators.update({id : id},{$push : { logs : ndescription } },function(err,doc){
        if(err) console.log(err.message);
    });
}

router.post('/ilogin',function (req,res) {
    if(req.headers['user-agent']==globals.AGENT && req.headers['user-agent-secret']==globals.AGENT_SECRET && globals.API_OPEN){
        var query = { id : parseInt(req.body.id), invigilatorSecret : req.headers['auth-token'] };
        db.invigilators.findOne(query,{_id:0,center:1,profile:1,firstname:1,lastname:1,aadhaar:1,id:1},function (err,doc) {
           if(err){
                res.status(500).send({status:false,message:"Unexpected Server Error"});
                addInvigilatorLog(doc.id,"Server Error..")
           }else{
                if(doc){
                    var payload = {
                        id:doc.id,
                        center:doc.center
                    };
                    var token = jwt.sign(payload, globals.JWT_SECRET,
                        { expiresIn:globals.JWT_TOKEN_VALIDATION_DURATION });
                    addInvigilatorLog(doc.id,"New Token Created.")
                    res.status(200).send({ status:true, token:token, center:doc.center, profile:doc.profile, firstname:doc.firstname,
                        lastname:doc.lastname, aadhaar:doc.aadhaar, id: doc.id});
                    addInvigilatorLog(doc.id,"Successful Login.")
                }else{
                    res.status(406).send({status:false,message:"Invalid Secret or Invigilator Id"});
                    addLog("Invigilator "+query.id+" tried Logging in using invalid secret.");
                }
           }
        });
    }else{
        if(globals.API_OPEN){
            res.status(400).send({status:false,message:"Invalid User-Agent"});
            addLog("Invalid user-agent "+req.headers['user-agent']+" tried loggin in.");
        }else{
            res.status(500).send({status:false,message:"Exam not Started yet! API is closed."});
        }
    }
});

router.post('/slogin',function (req,res) {
    if(req.headers['user-agent']==globals.AGENT && req.headers['user-agent-secret']==globals.AGENT_SECRET && globals.API_OPEN){
        if(req.headers['x-access-token']){
            var token = req.headers['x-access-token'];
            var id = parseInt(req.body.id);
            var enrollment = parseInt(req.body.enrollment);
            jwt.verify(token,globals.JWT_SECRET,function (err,decodedToken) {
                if(err) {
                    res.status(401).send({status:false,message:"Session invalid or Expired. Please login again as invigilator."});
                    addInvigilatorLog(id,"Invalid or Expired Token Used.");
                    addLog("Invalid or Expired token used by invigilator ("+id+")");
                }
                else {
                    if (decodedToken.id == id) {
                        db.candidates.findOne({enrollment: enrollment}, {_id:0,center:1,profile:1,enrollment:1,aadhaar:1,firstname:1,lastname:1,status:1}, function (err, doc) {
                            if (err){
                                res.status(500).send({status: false, message: "Server Error"});
                                   addInvigilatorLog(id,"Server Error");}
                            else {
                                if(doc){
                                    if (decodedToken.center == doc.center) {
                                        if (doc.status == "UNKNOWN"){
                                            res.status(200).send({status: true, enrollment: doc.enrollment, profile: doc.profile, firstname: doc.firstname, lastname: doc.lastname, aadhaar: doc.aadhaar});
                                            addInvigilatorLog(id,"Candidate ("+doc.enrollment+") Login Done.");
                                            addCandidateLog(doc.enrollment,"Logged in by invigilator ("+id+")");
                                        }
                                        else res.status(208).send({status: false, message: "Candidate already verified."});
                                    } else {
                                        res.status(208).send({status: false, message: "Candidate do not belong to your center."});
                                        addInvigilatorLog(id,"Candidate ("+doc.enrollment+") login failed due to different centers.");
                                        addCandidateLog(doc.enrollment,"Login attempt failed by invigilator ("+id+")");
                                    }
                                }else{
                                    res.status(409).send({status: false, message: "Candidate not found."});
                                }
                            }
                        });
                    }
                    else { res.status(401).send({status: false, message: "Invalid Session"});
                        addInvigilatorLog(id,"Invalid token used");
                        addLog("Invalid token used by invigilator ("+id+")");}
                }
            })
        }else{ res.status(400).send({status:false,message:"Please login as invigilator to begin session."}) }
    }else{
        if(globals.API_OPEN){ res.status(400).send({status:false,message:"Invalid User-Agent"});}
        else{res.status(500).send({status:false,message:"Exam not Started yet! API is closed."});}
    }
});

router.post('/bio',function (req,res) {
    if(req.headers['user-agent']==globals.AGENT && req.headers['user-agent-secret']==globals.AGENT_SECRET && globals.API_OPEN){
        if(req.headers['x-access-token']){
            var token = req.headers['x-access-token'];
            var id = parseInt(req.body.id);
            var enrollment = parseInt(req.body.enrollment);
            jwt.verify(token,globals.JWT_SECRET,function (err,decodedToken) {
                if(err) {
                    res.status(401).send({status:false,message:"Session invalid or Expired. Please login again as invigilator."});
                    addInvigilatorLog(id,"Invalid or Expired Token Used.");
                    addLog("Invalid or Expired token used by invigilator ("+id+")");
                }
                else {
                    if (decodedToken.id == id) {
                        db.candidates.update({enrollment: enrollment,center:decodedToken.center,status:"UNKNOWN"},
                            {$inc : {attempts:1} },function (err, doc) {
                            if (err) {
                                res.status(500).send({status: false, message: "Server Error"});
                                addInvigilatorLog(id,"Server Error during candidate("+enrollment+") biometric attempt.");
                            }
                            else {
                                if(doc.nModified==1){
                                    res.status(200).send({status: true});
                                    addInvigilatorLog(id,"Biometric attempt made for Candidate ("+enrollment+")");
                                    addCandidateLog(enrollment,"Biometric attempt made by Invigilator ("+id+")");
                                }else{ res.status(409).send({status: false, message: "Candidate not found or already authenticated."}); }
                            }
                        });
                    }
                    else { res.status(401).send({status: false, message: "Invalid Session"});
                        addInvigilatorLog(id,"Invalid Token Used.");
                        addLog("Invalid token used by invigilator ("+id+")");}
                }
            })
        }else{ res.status(400).send({status:false,message:"Please login as invigilator to begin session."}) }
    }else{
        if(globals.API_OPEN){ res.status(400).send({status:false,message:"Invalid User-Agent"});}
        else{res.status(500).send({status:false,message:"Exam not Started yet! API is closed."});}
    }
});

router.post('/auth',function(req,res){
    /*
     change status to success
     header : x-access-token,User-Agent-Secret,user-agent
     body:status
     */
    if(req.headers['user-agent']==globals.AGENT && req.headers['user-agent-secret']==globals.AGENT_SECRET && globals.API_OPEN){
        if(req.headers['x-access-token']){
            var token = req.headers['x-access-token'];
            var id = parseInt(req.body.id);
            var enrollment = parseInt(req.body.enrollment);
            jwt.verify(token,globals.JWT_SECRET,function (err,decodedToken) {
                if(err) {res.status(401).send({status:false,message:"Session invalid or Expired. Please login again as invigilator."});
                    addInvigilatorLog(id,"Invalid or Expired Token Used.");
                    addLog("Invalid or Expired token used by invigilator ("+id+")");
                }
                else {
                    if (decodedToken.id == id) {
                        db.candidates.update({enrollment: enrollment,center:decodedToken.center,status:"UNKNOWN"},
                            {$set : {status:"SUCCESS"} },function (err, doc) {
                                if (err)
                                    res.status(500).send({status: false, message: "Server Error"});
                                else {
                                    if(doc.nModified==1){
                                        res.status(200).send({status: true});
                                        addInvigilatorLog(id,"Candidate ("+enrollment+") Verified.");
                                        addCandidateLog(enrollment,"Verified by invigilator "+id);
                                    }else{
                                        res.status(409).send({status: false, message: "Candidate not found or already authenticated."});
                                        addInvigilatorLog(id,"Verification attempt discarded for candidate ("+enrollment+")");
                                        addCandidateLog(enrollment,"Verification attempt discarded by invigilator("+id+")");
                                    }
                                }
                            });
                    }
                    else { res.status(401).send({status: false, message: "Invalid Session"});
                        addInvigilatorLog(id,"Invalid Token Used");
                        addLog("Invalid token used by invigilator ("+id+")");}
                }
            })
        }else{ res.status(400).send({status:false,message:"Please login as invigilator to begin session."}) }
    }else{
        if(globals.API_OPEN){ res.status(400).send({status:false,message:"Invalid User-Agent"});}
        else{res.status(500).send({status:false,message:"Exam not Started yet! API is closed."});}
    }
});

router.post('/impersonation',function (req,res) {
    /*
     change status to failure
     header : x-access-token,User-Agent-Secret,user-agent
     body:status
     */
    if(req.headers['user-agent']==globals.AGENT && req.headers['user-agent-secret']==globals.AGENT_SECRET && globals.API_OPEN){
        if(req.headers['x-access-token']){
            var token = req.headers['x-access-token'];
            var id = parseInt(req.body.id);
            var enrollment = parseInt(req.body.enrollment);
            jwt.verify(token,globals.JWT_SECRET,function (err,decodedToken) {
                if(err) {
                    res.status(401).send({status:false,message:"Session invalid or Expired. Please login again as invigilator."});
                    addInvigilatorLog(id,"Invalid or Expired token used.");
                    addLog("Invalid or Expired token used by invigilator ("+id+")");
                }
                else {
                    if (decodedToken.id == id) {
                        db.candidates.update({enrollment: enrollment,center:decodedToken.center,status:"UNKNOWN"},
                            {$set : {status:"FAILURE"} },function (err, doc) {
                                if (err)
                                    res.status(500).send({status: false, message: "Server Error"});
                                else {
                                    if(doc.nModified==1){res.status(200).send({status: true});
                                    addInvigilatorLog(id,"Impersonation detected for candidate ("+enrollment+")");
                                    addCandidateLog(enrollment,"Impersonation detected by invigilator("+id+")");
                                    addLog("Impersonation detected by invigilator("+id+") candidate("+enrollment+")");
                                    }else{ res.status(409).send({status: false, message: "Candidate not found or already authenticated."});
                                        addInvigilatorLog(id,"Impersonation attempt discarded for candidate ("+enrollment+")");
                                        addCandidateLog(enrollment,"Impersonation attempt discarded by invigilator("+id+")");
                                    }
                                }
                            });
                    }
                    else { res.status(401).send({status: false, message: "Invalid Session"});
                        addInvigilatorLog(id,"Invalid Token Used");
                        addLog("Invalid token used by invigilator ("+id+")");}
                }
            })
        }else{ res.status(400).send({status:false,message:"Please login as invigilator to begin session."}) }
    }else{
        if(globals.API_OPEN){ res.status(400).send({status:false,message:"Invalid User-Agent"});}
        else{res.status(500).send({status:false,message:"Exam not Started yet! API is closed."});}
    }
});

router.post('/mycandidates',function (req,res) {
    if(req.headers['user-agent']==globals.AGENT && req.headers['user-agent-secret']==globals.AGENT_SECRET && globals.API_OPEN){
        if(req.headers['x-access-token']){
            var token = req.headers['x-access-token'];
            var id = parseInt(req.body.id);
            jwt.verify(token,globals.JWT_SECRET,function (err,decodedToken) {
                if(err){ res.status(401).send({status:false,message:"Session invalid or Expired. Please login again as invigilator."});
                    addInvigilatorLog(id,"Invalid or Expired token used");
                    addLog("Invalid or Expired token used by invigilator ("+id+")");
                }
                else {
                    if (decodedToken.id == id) {
                        db.candidates.find({center: decodedToken.center},
                            {_id:0,profile:1,enrollment:1,aadhaar:1,email:1,firstname:1,lastname:1,status:1,attempts:1}, function(err, docs) {
                            if (err)
                                res.status(500).send({status: false, message: "Server Error"});
                            else {
                                if(docs){
                                    res.status(200).send({status: true,count:docs.length,list:docs});
                                    addInvigilatorLog(id,"Request for candidate list approved.");
                                }else{
                                    res.status(409).send({status: false, message: "Candidates not found."});
                                }
                            }
                        });
                    }
                    else { res.status(401).send({status: false, message: "Invalid Session"});
                        addInvigilatorLog(id,"Invalid token Used");
                        addLog("Invalid token used by invigilator ("+id+")");
                    }
                }
            })
        }else{ res.status(400).send({status:false,message:"Please login as invigilator to begin session."}) }
    }else{
        if(globals.API_OPEN){ res.status(400).send({status:false,message:"Invalid User-Agent"});}
        else{res.status(500).send({status:false,message:"Exam not Started yet! API is closed."});}
    }
});

router.post('/sdetails',function (req,res) {
    if(req.headers['user-agent']==globals.AGENT && req.headers['user-agent-secret']==globals.AGENT_SECRET && globals.API_OPEN){
        if(req.headers['x-access-token']){
            var token = req.headers['x-access-token'];
            var id = parseInt(req.body.id);
            var enrollment = parseInt(req.body.enrollment);
            jwt.verify(token,globals.JWT_SECRET,function (err,decodedToken) {
                if(err){res.status(401).send({status:false,message:"Session invalid or Expired. Please login again as invigilator."});
                    addInvigilatorLog(id,"Invalid or Expired token used.");
                    addLog("Invalid or Expired token used by invigilator ("+id+")");
                }
                else {
                    if (decodedToken.id == id) {
                        db.candidates.findOne({enrollment: enrollment}, {_id:0,center:1,profile:1,enrollment:1,aadhaar:1,firstname:1,lastname:1,status:1,attempts:1,email:1,dob:1}, function (err, doc) {
                            if (err)
                                res.status(500).send({status: false, message: "Server Error"});
                            else {
                                if(doc){
                                    if (decodedToken.center == doc.center) {
                                        res.status(200).send({status: true, enrollment: doc.enrollment, profile: doc.profile, firstname: doc.firstname,
                                                lastname: doc.lastname, aadhaar: doc.aadhaar,cstatus:doc.status,attempts:doc.attempts,email:doc.email,dob:doc.dob});
                                    } else {
                                        res.status(208).send({status: false, message: "Candidate do not belong to your center."});
                                        addInvigilatorLog(id,"Attempt of candidate ("+enrollment+") details made of different center.");
                                        addCandidateLog(enrollment,"Details request disapproved for invigilator ("+id+")");
                                    }
                                }else{
                                    res.status(409).send({status: false, message: "Candidate not found."});
                                }
                            }
                        });
                    }
                    else { res.status(401).send({status: false, message: "Invalid Session"});
                        addInvigilatorLog(id,"Invalid token used");
                        addLog("Invalid token used by invigilator ("+id+")");}
                }
            })
        }else{ res.status(400).send({status:false,message:"Please login as invigilator to begin session."}) }
    }else{
        if(globals.API_OPEN){ res.status(400).send({status:false,message:"Invalid User-Agent"});}
        else{res.status(500).send({status:false,message:"Exam not Started yet! API is closed."});}
    }
});
module.exports = router;
