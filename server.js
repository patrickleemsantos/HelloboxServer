var express = require("express");
var path = require("path");
var bodyParser = require ("body-parser");

//Start of HTTPS
var fs = require('fs');
var https = require('https');
var http = require('http');

var server = https.createServer({
    key: fs.readFileSync('/etc/pki/tls/certs/hellobox.com.ph.key'),
    cert: fs.readFileSync('/etc/pki/tls/certs/2d45f93e0c2acade.crt'),
    ca: fs.readFileSync('/etc/pki/tls/certs/gd_bundle-g2-g1.crt'),
    requestCert: false,
    rejectUnauthorized: false
},app);
// server.listen(444);
//End of HTTPS

var index = require("./routes/index");
var bookings = require("./routes/bookings");
var driverLocation = require("./routes/driverLocation");
var drivers = require("./routes/drivers");
var accounts = require("./routes/accounts");
var bookingHistory = require("./routes/bookingHistory");

var app = express();
var httpPort = 3121;
var httpsPort = 444;
var socket_io = require("socket.io");
var io = socket_io();

// Views
app.set("views",  path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.engine("html", require("ejs").renderFile);

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});  

// Body parser MW
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Routes
app.use("/", index);
app.use("/api", bookings);
app.use("/api", driverLocation);
app.use("/api", drivers);
app.use("/api", accounts);
app.use("/api", bookingHistory);

//Original
// io.listen(app.listen(httpPort, function(){
// 	console.log("Server running on port", httpPort);
// }));

//Start of HTTP
var httpServer = http.createServer(app);
io.listen(httpServer.listen(httpPort, function(){
	console.log("Server running on port", httpPort);
}));
//End of HTTP

//Start of HTTPS
var httpsServer = https.createServer({
    key: fs.readFileSync('/etc/pki/tls/certs/hellobox.com.ph.key'),
    cert: fs.readFileSync('/etc/pki/tls/certs/2d45f93e0c2acade.crt'),
    ca: fs.readFileSync('/etc/pki/tls/certs/gd_bundle-g2-g1.crt'),
    requestCert: false,
    rejectUnauthorized: false
},app);
io.listen(httpsServer.listen(httpsPort, function() {
	console.log("Server running on port", httpsPort);
}));
//End of HTTPS

app.io = io.on("connection", function(socket){
	console.log("Socket connected: " + socket.id);
});