var express = require("express");
var router = express.Router();
var mongojs = require("mongojs");

var db = mongojs("mongodb://52.220.212.6:27017/hellobox_db", ["drivers_location"]);


//upadate driver socket id
router.put("/driverLocationSocket/:id", function(req, res, next){

	var io = req.app.io;
	if(!req.body){
		res.status(400);
		res.json({
			"error":"Bad data"
		});

	} else {
		// db.driversLocation.update({_id:mongojs.ObjectId(req.params.id)}, 
		// 	{$set: {socketId:req.body.socketId}}, function(err, updateDetails){
		// 		if(err){
		// 			res.send(err);

		// 		}else{
		// 			res.send(updateDetails);
		// 		}
		// });
		db.drivers_location.update({driver_id: req.params.id}, 
		{$set: {socket_id: req.body.socket_id}}, function(err, updateDetails){
			if(err){
				res.send(err);
			}else{
				res.send(updateDetails);
			}
		});
	}
});

// //get nearby driver
// router.get("/driverLocation", function(req, res, next){
// 	//Original
// 	// db.drivers_location.ensureIndex({"coordinate":"2dsphere"});
// 	// db.drivers_location.find({
// 	// 		// "coordinate":{
// 	// 		// 	"$near":{
// 	// 		// 		"$geometry":{
// 	// 		// 			"type":"Point",
// 	// 		// 			"coordinates": [parseFloat(req.query.longitude), parseFloat(req.query.latitude)]
// 	// 		// 		},
// 	// 		// 		"$maxDistance":10000
// 	// 		// 	}
// 	// 		// },
// 	// 		// "socket_id" : {$ne : ''} 
// 	// 		"coordinate":{
// 	// 			"$near":{
// 	// 				"$geometry":{
// 	// 					"type":"Point",
// 	// 					"coordinates": [parseFloat(req.query.longitude), parseFloat(req.query.latitude)]
// 	// 				}
// 	// 			}
// 	// 		},
// 	// 		"socket_id" : {$ne : ''} 
// 	// 	}, function(err, location){
// 	// 		if(err){
// 	// 			res.send(err);

// 	// 		}else{
// 	// 			res.send(location);
// 	// 		}
// 	// });


// 	//Testing
// 	db.drivers_location.ensureIndex({"coordinate":"2dsphere"});
// 	db.drivers_location.find({"status": "online"}, function(err, location){
// 			if(err){
// 				res.send(err);

// 			}else{
// 				res.send(location);
// 			}
// 	});
// });

//Get Single Driver and emit track by user to driver
router.get("/driverLocation/:id", function(req, res, next){
	var io = req.app.io;
    db.drivers_location.findOne({driver_id: req.params.id},function(err, location){
        if (err){
            res.send(err);
        }
        res.send(location);
        io.emit("trackDriver", location);
    });
});

// //Get Current Driver Location
// router.get("/getCurrentDriverLocation/:id", function(req, res, next){
// 	var io = req.app.io;
//     db.drivers_location.findOne({"driver_id": req.params.id},function(err, location){
//         if (err){
//             res.send(err);
//         }
//         res.send(location);
//     });
// });

// //Get driver location status
// router.put("/updateDriverStatus", function(req, res, next){
//     db.drivers_location.update({driver_id: req.body.driver_id},{ $set: {
// 		status: req.body.status
// 	}}, function(err, updateDetails){
// 		if (err){
// 			res.send(err);
// 		}
// 		if (updateDetails){
// 			res.send(updateDetails);
// 		}
// 	});
// });

// //Get driver location status
// router.put("/updateDriverLocation", function(req, res, next){
// 	const latitude = req.body.latitude;
// 	const longitude = req.body.longitude;
//     // db.drivers_location.update({driver_id: req.body.driver_id},{ $set: {
// 	// 	"coordinate.coordinates[1]" : latitude,
// 	// 	"coordinate.coordinates[0]" : longitude
// 	var newCoordinates = [];
// 	newCoordinates.push(parseFloat(longitude));
// 	newCoordinates.push(parseFloat(latitude));
// 	db.drivers_location.update({driver_id: req.body.driver_id},{ $set: {
// 		"coordinate.coordinates" : newCoordinates

// 	}}, function(err, updateDetails) {
// 		if (err){
// 			console.log(updateDetails);
// 			res.send(err);
// 		}
// 		if (updateDetails){
// 			res.send(updateDetails);
// 		}
// 	});
// });

//Update Location by driver to user
router.put("/driverLocation/:id", function(req, res, next){
    var io = req.app.io;
    var location = req.body;
    var latitude = parseFloat(location.latitude);
    var longitude = parseFloat(location.longitude);
    if (!location){
        res.status(400);
        res.json({
            "error":"Bad Data"
        });
    } else {
        db.drivers_location.update({driver_id: req.params.id},{ $set: {
        	socket_id:location.socket_id,
        	coordinate:{
                "type": "Point",
        		coordinates:[
                    longitude,
        			latitude
    			]
    		}
    	}}, function(err, updateDetails){
        if (err){
            console.log(updateDetails);
            res.send(err);
        }
        if (updateDetails){
            //Get updated location
            db.drivers_location.findOne({driver_id: req.params.id},function(error, updatedLocation){
                if (error){
                	res.send(error);
				}
                res.send(updatedLocation);
                io.emit("action", {
                    type:"UPDATE_DRIVER_LOCATION",
                    payload:updatedLocation
                });
            });
        }
    });
    }
});



module.exports = router;