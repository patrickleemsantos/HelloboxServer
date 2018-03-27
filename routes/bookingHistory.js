var express = require("express");
var router = express.Router();
var mongojs = require("mongojs");

var db = mongojs("mongodb://52.220.212.6:27017/hellobox_db", ["bookings_history"]);

router.get("/getBookingHistory", function(req, res, next){
	db.bookings_history.find({"booking_id": req.query.booking_id}).sort({"timestamp": -1}).toArray(function(err, bookingsHistory) {
		if (err) {
			res.send(err);
        }
		res.json(bookingsHistory);
	})
});

module.exports = router;