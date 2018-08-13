/**
 * Created by aditya on 8/8/18.
 */
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var fs = require('fs');
var sessions = require('express-session');
var cookieParser = require('cookie-parser');
var compression = require('compression');
var fileType = require('file-type');
var helmet = require('helmet');
var qr = require('qr-image');

var login=require('./routes/index');
var adminlogin=require('./routes/adminlogin');
var register=require('./routes/register');
var api = require('./routes/api');

var port =80;
var app=express();	//initialize app

//small get function to render profile photos
app.get('/profilephotos/:imagename', function(req, res){
    var imagename = req.params.imagename;
    var imagepath = __dirname+"/profilephotos/"+imagename;
    var image = fs.readFileSync(imagepath);
    var mime = fileType(image).mime;
    res.writeHead(200, {'Content-Type': mime });
    res.end(image, 'binary');
});

app.get('/qr/:enroll', function(req, res){
    var qr_svg = qr.image(req.params.enroll, { type: 'png' });
    qr_svg.pipe(res);
});

//view engine
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');
app.engine('html',require('ejs').renderFile);

//set Static folder
app.use(express.static(path.join(__dirname,'client'))); //for angular 2 related stuff

//body parser
app.use(bodyParser.json({limit:'50mb'}));
app.use(bodyParser.urlencoded({extended:true, limit:'50mb'}));
app.use(cookieParser());
app.use(compression());
app.use(helmet());
app.use(sessions({
    cookieName : 'dbt-auth',
    secret : 'nemesis-dev01-dbtauth',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge : 30*60*1000,        // 1/2 hour
        ephemeral: true, // when true, cookie expires when the browser closes
        httpOnly: false, // when true, cookie is not accessible from javascript
        secure: false // when true, cookie will only be sent over SSL. use key 'secureProxy' instead if you handle SSL not in your node process
    }
}));

app.use('/',login);
app.use('/adminlogin',adminlogin);
app.use('/register',register);
app.use('/api',api);

app.listen(port,function(){
    console.log("Server Started on port "+port);
});