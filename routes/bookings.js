var express = require("express");
var router = express.Router();
var mongojs = require("mongojs");

var db = mongojs("mongodb://52.220.212.6:27017/hellobox_db", ["bookings"]);

router.get("/bookings", function(req, res, next){
	db.bookings.find(function(err, bookings) {
		if (err) {
			res.send(err);
		}
		res.json(bookings);
	})
});

// For testing purposes only
router.get("/manualBookingStatus", function(req, res, next){
	var io = req.app.io;
	var dateFormat = require('dateformat');
	let status = "APPROVED";
	let booking_id = "8801";

	db.bookings.update({"booking_id": booking_id},{ $set: {
		status: status
	}}, function(err, booking) {
		if (err){
			res.send(err);
		}
		if (booking){
			db.bookings.findOne({"booking_id": booking_id},function(error, updatedBooking){
                if (error){
                    res.send(error);
				}
				
				res.send(updatedBooking);

				if (status == 'APPROVED') {
					io.emit("action", {
						type:"BOOKING_APPROVED",
						payload:updatedBooking
					});
				}

				if (status == 'REJECTED') {
					io.emit("action", {
						type:"BOOKING_REJECTED",
						payload:updatedBooking
					});
				}

				if (status == 'ON MY WAY') {
					io.emit("action", {
						type:"BOOKING_ON_MY_WAY",
						payload:updatedBooking
					});
				}

				if (status == 'LOADED AND DELIVERY STARTED') {
					io.emit("action", {
						type:"BOOKING_LOADED_AND_DELIVERY_STARTED",
						payload:updatedBooking
					});
				}

				if (status == 'ARRIVED AT DELIVERY LOCATION') {
					io.emit("action", {
						type:"BOOKING_ARRIVED_AT_DELIVERY_LOCATION",
						payload:updatedBooking
					});
				}

				if (status == 'JOB COMPLETED') {
					io.emit("action", {
						type:"BOOKING_JOB_COMPLETED",
						payload:updatedBooking
					});
				}

				//Insert to bookings history
				var history = {
					"booking_id": updatedBooking.booking_id,
					"status": status,
					"timestamp": dateFormat(new Date(), "dd mmm yyyy, hh:MM TT")
				};
				db.bookings_history.save(history, function(err, savedHistory){
					if(err){
						res.send(err);
					}	

					if (savedHistory) {
						db.bookings_history.find({"booking_id": updatedBooking.booking_id}).sort({"timestamp": -1}).toArray(function(err, bookingsHistory) {
							if (err) {
								res.send(err);
							}
							
							if (status !== "APPROVED") {
								var newBookingHistory = {
									"booking_id": updatedBooking.booking_id,
									"booking_history": bookingsHistory
								};

								io.emit("action", {
									type:"EMIT_BOOKING_HISTORY",
									payload:newBookingHistory
								});
							}
						})
					}
				});
            });
		}
	});
});

// Get driver bookings
router.get("/bookingsByDriver", function(req, res, next){
	db.bookings.find({"driver.driver_id": req.query.driver_id,
						"status" : {$nin : ["CANCELLED","PENDING", "REJECTED"]}}).sort({"timestamp": -1}).toArray(function(err, bookings) {
		if (err) {
			res.send(err);
		}
		res.json(bookings);
	})
	
});

// Get driver earnings
router.get("/earningsByDriver", function(req, res, next){
	console.log(req.query.order + " " + req.query.driver_id);
	if (req.query.order == "day") {
		var agg = [
				{$match: {
							status: "JOB COMPLETED", 
							"driver.driver_id": req.query.driver_id
						}
				},
				{$group: {
							_id: { $substr: [ "$pick_up_date", 0, 11] },
							total: {$sum: "$driver_price"}
						}
				},
				{ $sort: { _id: -1 } }
			];
	}

	if (req.query.order == "month") {
		var agg = [
				{$match: {
							status: "JOB COMPLETED", 
							"driver.driver_id": req.query.driver_id
						}
				},
				{$group: {
							_id: { $substr: [ "$pick_up_date", 3, 8] },
							total: {$sum: "$driver_price"}
						}
				},
				{ $sort: { _id: -1 } }
			];
	}

	if (req.query.order == "year") {
		var agg = [
			{$match: {
						status: "JOB COMPLETED", 
						"driver.driver_id": req.query.driver_id
					}
			},
			{$group: {
						_id: { $substr: [ "$pick_up_date", 7, 4] },
						total: {$sum: "$driver_price"}
					}
			},
			{ $sort: { _id: -1 } }
		];
	}

	db.bookings.aggregate(agg, function(err, bookings){
		if (err) { 
			res.send(error);
		}
		
		console.log(bookings);
		res.json(bookings);
	});
});

router.get("/bookingsByAccount", function(req, res, next){
	if (req.query.filter === "current") {
		db.bookings.find({"account.account_id": req.query.account_id,
							"status" : {$nin : ["PENDING","JOB COMPLETED","REJECTED","CANCELLED"]}}).sort({"timestamp": -1}).toArray(function(err, bookings) {
			if (err) {
				res.send(err);
			}

			res.json(bookings);
		})
	} else if (req.query.filter === "completed") {
		db.bookings.find({"account.account_id": req.query.account_id,
							"status" : "JOB COMPLETED"}).sort({"timestamp": -1}).toArray(function(err, bookings) {
			if (err) {
				res.send(err);
			}

			res.json(bookings);
		})
	}
});

// Update booking status
router.put("/updateBookingStatus", function(req, res, next){
	var io = req.app.io;
	var dateFormat = require('dateformat');

    db.bookings.update({_id: mongojs.ObjectId(req.body.id)},{ $set: {
		status: req.body.status,
		timestamp: dateFormat(new Date(), "dd mmm yyyy, hh:MM TT")
	}}, function(err, booking) {
		if (err){
			res.send(err);
		}
		if (booking){
			db.bookings.findOne({_id: mongojs.ObjectId(req.body.id)},function(error, updatedBooking){
                if (error){
                    res.send(error);
				}
				
				res.send(updatedBooking);

				if (req.body.status == 'APPROVED') {
					io.emit("action", {
						type:"BOOKING_APPROVED",
						payload:updatedBooking
					});
				}

				if (req.body.status == 'CANCELLED') {
					io.emit("action", {
						type:"BOOKING_CANCELLED",
						payload:updatedBooking
					});
				}

				if (req.body.status == 'REJECTED') {
					io.emit("action", {
						type:"BOOKING_REJECTED",
						payload:updatedBooking
					});
				}

				if (req.body.status == 'ON MY WAY') {
					io.emit("action", {
						type:"BOOKING_ON_MY_WAY",
						payload:updatedBooking
					});
				}

				if (req.body.status == 'LOADED AND DELIVERY STARTED') {
					io.emit("action", {
						type:"BOOKING_LOADED_AND_DELIVERY_STARTED",
						payload:updatedBooking
					});
				}

				if (req.body.status == 'ARRIVED AT DELIVERY LOCATION') {
					io.emit("action", {
						type:"BOOKING_ARRIVED_AT_DELIVERY_LOCATION",
						payload:updatedBooking
					});
				}

				if (req.body.status == 'JOB COMPLETED') {
					io.emit("action", {
						type:"BOOKING_JOB_COMPLETED",
						payload:updatedBooking
					});

					//Update earnings for driver
					// var driverPrice = (parseFloat(updatedBooking.fare) + parseFloat(updatedBooking.additional_price)) * .20;

					// db.bookings.update({_id: mongojs.ObjectId(req.body.id)},{ $set: {
					// 	driver_price: driverPrice
					// }}, function(err, booking) {
					// 	if (err){
					// 		res.send(err);
					// 	}
					// });
				}

				//Insert to bookings history
				var history = {
					"booking_id": updatedBooking.booking_id,
					"status": req.body.status,
					"timestamp": dateFormat(new Date(), "dd mmm yyyy, hh:MM TT")
				};
				db.bookings_history.save(history, function(err, savedHistory){
					if(err){
						res.send(err);
					}

					if (savedHistory) {
						db.bookings_history.find({"booking_id": updatedBooking.booking_id}).sort({"timestamp": -1}).toArray(function(err, bookingsHistory) {
							if (err) {
								res.send(err);
							}
							
							if (req.body.status !== "APPROVED" && req.body.status !== "PENDING") {
								var newBookingHistory = {
									"booking_id": updatedBooking.booking_id,
									"booking_history": bookingsHistory
								};

								io.emit("action", {
									type:"EMIT_BOOKING_HISTORY",
									payload:newBookingHistory
								});
							}
						})
					}
				});
				
				//Send push notification to user
				if (req.body.status != 'CANCELLED' && req.body.status != 'REJECTED') {
					db.accounts.findOne({ "account_id": updatedBooking.account.account_id },function(error, account){
						if (error){
							res.send(error);
						}

						sendOneSignalNotification(account.notification_id, "Hi " + account.first_name + ", our driver " + updatedBooking.driver.first_name + " updated the status of JOB ID: " + updatedBooking.booking_id + " to " + req.body.status);
					});
				}
            });
		}
	});
});

// Update booking status
router.put("/updateBookingRating", function(req, res, next){
	var io = req.app.io;

    db.bookings.update({_id: mongojs.ObjectId(req.body.id)},{ $set: {
		rating: parseInt(req.body.rating),
		comment: req.body.comment,
	}}, function(err, booking) {
		if (err){
			res.send(err);
		}
		if (booking){
			db.bookings.findOne({_id: mongojs.ObjectId(req.body.id)},function(error, updatedBooking){
                if (error){
                    res.send(error);
				}
				
				res.send(updatedBooking);
            });
		}
	});
});

router.post("/bookings", function(req, res, next){
	var moment = require('moment');

	var booking = req.body.data;
	var nearByDriver = req.body.nearByDriver;
	var io = req.app.io;

	if(!booking.account){
		res.status(400);
		res.json({
			error:"Bad data"
		});	
	} else {
		var saveBooking = {
						booking_id : booking.booking_id,
						account: {
							account_id: booking.account.account_id,
							first_name: booking.account.first_name,
							last_name: booking.account.last_name,
							mobile_number: booking.account.mobile_number,
						},
						driver: {
							driver_id: booking.driver.driver_id,
							first_name: booking.driver.first_name,
							last_name: booking.driver.last_name,
							profile_picture: booking.driver.profile_picture,
							rating: booking.driver.rating,
							mobile_number: booking.driver.mobile_number,
							vehicle: booking.driver.vehicle
						},
						pick_up: booking.pick_up,
						drop_off: booking.drop_off,
						drop_off1: booking.drop_off1,
						drop_off2: booking.drop_off2,
						drop_off3: booking.drop_off3,
						drop_off4: booking.drop_off4,
						fare: parseFloat(booking.fare),
						additional_price: parseFloat(booking.additional_price),
						driver_price: parseFloat(booking.driver_price),
						additional_services: booking.additional_services,
						status: booking.status,
						rating: parseInt(booking.rating),
						pick_up_date: booking.pick_up_date,
						note: booking.note,
						timestamp: booking.timestamp
					};
		db.bookings.save(saveBooking, function(err, savedBooking){
			if(err){
				res.send(err);
			}
			res.json(savedBooking);

			//Get driver notification id
			db.drivers.findOne({"driver_id": req.body.nearByDriver.driver_id},function(error, driver){
                if (error){
                    res.send(error);
				}

				sendOneSignalNotification(driver.notification_id, "Hi " + driver.first_name + ", you have a new booking request!");
			});

			io.emit("action", {
				type: "BOOKING_RECEIVED",
				payload: savedBooking
			});
		});
	}
});


// Driver Update Booking done on driver side
router.put("/bookings/:id", function(req, res, next) {
    var io = req.app.io;
    var booking = req.body;
    if (!booking.status){
        res.status(400);
        res.json({
            "error":"Bad Data"
        });
    } else {
        db.bookings.update({_id: mongojs.ObjectId(req.params.id)},{ $set: { 
        	driver_id: booking.driver_id,
        	status: booking.status 
        }}, function(err, updatedBooking){
        if (err){
			res.send(err);
        }
        if (updatedBooking){
            //Get Confirmed booking
            db.bookings.findOne({_id: mongojs.ObjectId(req.params.id)},function(error, confirmedBooking){
                if (error){
                    res.send(error);
                }
				res.send(confirmedBooking);
                io.emit("action", {
                    type:"BOOKING_CONFIRMED",
                    payload:confirmedBooking
				});
            });
        }
    });
    }
});

function sendOneSignalNotification(notification_id, message) {
	var sendNotification = function(data) {
	var headers = {
		"Content-Type": "application/json; charset=utf-8",
		"Authorization": "Basic NGEwMGZmMjItY2NkNy0xMWUzLTk5ZDUtMDAwYzI5NDBlNjJj"
	};
	
	var options = {
		host: "onesignal.com",
		port: 443,
		path: "/api/v1/notifications",
		method: "POST",
		headers: headers
	};
	
	var https = require('https');
	var req = https.request(options, function(res) {  
		res.on('data', function(data) {
			console.log("Response:");
			console.log(JSON.parse(data));
		});
	});
	
	req.on('error', function(e) {
		console.log("ERROR:");
		console.log(e);
	});
	
	req.write(JSON.stringify(data));
		req.end();
	};

	var message = { 
		app_id: "6a897100-dab6-4b9b-8af8-d222658fa89e",
		contents: {"en": message},
		include_player_ids: [notification_id],
		large_icon: "http://52.220.212.6/hellobox-backend/assets/images/logo.png"
	};
	
	sendNotification(message);
}

module.exports = router;