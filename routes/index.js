var express    = require("express"),
    router     = express.Router(),
    passport   = require("passport"),
    middleware = require('../middleware/index'),
    User       = require("../models/user"),
    Place      = require("../models/place");

    
router.get("/", function(req, res){
    
    res.render("landing");
});

//REGISTER FORM

router.get("/register", function(req, res){
    res.render("register");
});

router.post("/register", function(req, res){
    var newUser = new User({
        username: req.body.username
    });
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            req.flash("error", err.message + ".");
            return res.render("register")
        }
        passport.authenticate("local")(req, res, function(){
            req.flash("success", "Welcome to CityPlaces: " + user.username);
            res.redirect("/");
        });
    });
});

// LOGIN FORM

router.get("/login", function(req, res){
    res.render("login");


});

router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/",
        failureRedirect: "/login"
    }), function(req, res){ });

// LOGOUT LOGIC ROUTE

router.get("/logout", function(req, res){
    req.logout();
    req.flash("success", "Logged You Out!")
    res.redirect("/");
});


module.exports = router




