var express = require("express");
var router = express.Router();
var mongojs = require("mongojs");

var db = mongojs("mongodb://52.220.212.6:27017/hellobox_db", ["accounts"]);
const saltRounds = 10;

//Login Driver
router.get("/accountLogin", function(req, res, next) {
    var bcrypt = require('bcrypt');
    const login_preferece = req.query.login_preference;
    
    if (login_preferece == "mobile") {
        db.accounts.findOne({
                        mobile_number: req.query.username
                    }, function(err, account) {
            if (err) {
                res.send(err);
            }

            if (!account) {
                res.json({
                    "error":"Account doesn't exist"
                });
            } else {
                bcrypt.compare(req.query.password, account.password, function(err, result){
                    if (result == true){
                        res.send(account);
                    } else {
                        res.json({
                            "error":"Incorrect password"
                        });
                    }
                });
            }
        });
    } else {
        db.accounts.findOne({
                        email: req.query.username
                    }, function(err, account) {
            if (err) {
                res.send(err);
            }

            if (!account) {
                res.json({
                    "error":"Account doesn't exist"
                });
            } else {
                bcrypt.compare(req.query.password, account.password, function(err, result){
                    if (result == true){
                        res.send(account);
                    } else {
                        res.json({
                            "error":"Incorrect password"
                        });
                    }
                });
            }
        });
    }
});

//Add account
router.post("/addAccount", function(req, res, next) {
    var bcrypt = require('bcrypt');
    var account = req.body;

    if (!account){
        res.status(400);
        res.json({
            "error":"Bad Data"
        });
    } else {
        var accountID = account.account_id;
        var firstName = account.first_name;
        var lastName = account.last_name;
        var email = account.email;
        var mobile_number = account.mobile_number;
        var password = account.password;

        //Check if email exist
        db.accounts.findOne({"email": email}, function(err, checkedEmailAccount) {
            if (err) {
                res.send(err);
            }

            if (!checkedEmailAccount) {
                //Check if mobile number exist
                db.accounts.findOne({"mobile_number": mobile_number}, function(err, checkedMobileNumberAccount) {
                    if (err) {
                        res.send(err);
                    }

                    if (!checkedMobileNumberAccount) {
                        bcrypt.hash(password, saltRounds, function( err, bcryptedPassword) {
                            var newAccount = {
                                "account_id": accountID,
                                "email": email,
                                "first_name": firstName,
                                "last_name": lastName,
                                "mobile_number": mobile_number,
                                "password": bcryptedPassword,
                            };

                            db.accounts.save(newAccount, function(err, savedAccount){
                                if (err) {
                                    res.send(err);
                                }
                                
                                res.json(savedAccount);
                            });
                        });
                    } else {
                        res.json({
                            "error":"Account already exist"
                        });
                    }
                });
            } else {
                res.json({
                    "error":"Account already exist"
                });
            }
        });
    }
});

router.put("/updatePushNotificationID", function(req, res, next){
    db.accounts.update({"account_id": req.body.account_id},{ $set: {
		notification_id: req.body.notification_id
	}}, function(err, accounts) {
		if (err){
			res.send(err);
		}
			
		res.send(accounts);
	});
});

module.exports = router;
