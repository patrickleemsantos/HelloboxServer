var express = require("express");
var router = express.Router();
var mongojs = require("mongojs");

var db = mongojs("mongodb://52.220.212.6:27017/hellobox_db", ["drivers"]);

//Login Driver
router.get("/driverLogin", function(req, res, next) {
    db.drivers.findOne({
                    driver_id: req.query.username
                }, function(err, driver) {
        if (err) {
            res.send(err);
        }

        if (!driver) {
            res.json({
                "error":"Driver doesn't exist"
            });
        } else {
            if (driver.password != req.query.password) {
                res.json({
                    "error":"Incorrect password"
                });
            } else {
                res.send(driver);
            }
        }
    });
});

//Update driver notification
router.put("/updateDriverPushNotificationID", function(req, res, next){
    db.drivers.update({"driver_id": req.body.driver_id},{ $set: {
		notification_id: req.body.notification_id
	}}, function(err, accounts) {
		if (err){
			res.send(err);
		}
			
		res.send(accounts);
	});
});

//Get Single Driver
router.get("/driver/:id", function(req, res, next){
    db.drivers.findOne({driver_id: req.params.id}, function(err, driver){
        if (err){
            res.send(err);
        }
        res.send(driver);
    });
});

//Get Current Driver Location
router.get("/getCurrentDriverLocation/:id", function(req, res, next){
	var io = req.app.io;
    db.drivers.findOne({"driver_id": req.params.id},function(err, driver){
        if (err){
            res.send(err);
        }

        currentLocation = {
            "coordinate": driver.coordinate
        };

        res.send(currentLocation);
    });
});

//Get nearby drivers
router.get("/getNearByDrivers", function(req, res, next){
    var dateFormat = require('dateformat');
    var moment = require('moment')

	db.drivers.ensureIndex({"coordinate":"2dsphere"});
	// db.drivers.find({"coordinate":{
    //                         "$near":{
    //                             "$geometry":{
    //                                 "type":"Point",
    //                                 "coordinates": [parseFloat(req.query.longitude), parseFloat(req.query.latitude)]
    //                             }
    //                         }
    //                     },
    //                     "status": "Active",
    //                     "driving_status": "online"}, function(err, nearByDrivers){
    db.drivers.find({"status": "Active",
                    "driving_status": "online"}, function(err, nearByDrivers){
        
        if(err){
            res.send(err);
        } else {
            var drivers = [];

            for (var i = 0, len = nearByDrivers.length; i < len; i++) {
                let lastUpdateTime = moment(dateFormat(nearByDrivers[i].last_update, "yyyy-mm-dd h:MM:ss"));
                let currentDateTime = moment(dateFormat(new Date(), "yyyy-mm-dd h:MM:ss"));
                let timeDifference = currentDateTime.diff(lastUpdateTime, 'seconds');

                // if (timeDifference < 100) { 
                    drivers.push({
                        "_id": nearByDrivers[i]._id,
                        "driver_id": nearByDrivers[i].driver_id,
                        "first_name": nearByDrivers[i].first_name,
                        "last_name": nearByDrivers[i].last_name,
                        "profile_picture": nearByDrivers[i].profile_picture,
                        "rating": nearByDrivers[i].rating,
                        "mobile_number": nearByDrivers[i].mobile_number,
                        "vehicle": nearByDrivers[i].vehicle,
                        "coordinate": nearByDrivers[i].coordinate
                    });
                // }
            }

            res.send(drivers);
        }
	});
});

//Update driver location
router.put("/updateDriverLocation", function(req, res, next){
    // console.log("Updating location for driver " + req.body.driver_id + "...");

    var dateFormat = require('dateformat');
	const latitude = req.body.latitude;
	const longitude = req.body.longitude;

	var newCoordinates = [];
	newCoordinates.push(parseFloat(longitude));
	newCoordinates.push(parseFloat(latitude));
	db.drivers.update({driver_id: req.body.driver_id},{ $set: { 
                            "coordinate.coordinates" : newCoordinates,
                            "last_update": dateFormat(new Date(), "dd mmm yyyy, hh:MM TT")

	}}, function(err, updateDetails) {
		if (err){
			console.log(updateDetails);
			res.send(err);
		}
		if (updateDetails){
			res.send(updateDetails);
		}
	});
});

//Update driver status
router.put("/updateDriverStatus", function(req, res, next){
    // console.log("Updating status for driver " + req.body.driver_id + " to " + req.body.status + "...");

    db.drivers.update({driver_id: req.body.driver_id},{ $set: {
		        driving_status: req.body.status
	}}, function(err, updateDetails){
		if (err){
			res.send(err);
		}
		if (updateDetails){
			res.send(updateDetails);
		}
	});
});

module.exports = router;
