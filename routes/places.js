var express      = require("express"),
    router       = express.Router(),
    middleware   = require('../middleware/index'),
    Place        = require("../models/place"),
    Comment        = require("../models/comment"),
    NodeGeocoder = require('node-geocoder');

var options = {
    provider: "google",
    httpAdapter: 'https',
    apiKey: process.env.GEOCODER_API_KEY,
    formatter: null
}

var geocoder = NodeGeocoder(options)


router.get("/:city/places/getPlaces", (req, res) => {

    
    var city = req.params.city;
    var cityCap = toTitleCase(city);
    var filterObj = {};
    filterObj['city'] = city;

    if(req.query.search != ''){
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        filterObj['name'] = regex;    
    }

    if(req.query.category != ''){
        filterObj['category'] = req.query.category;    
    }

    if(req.query.category == 'All'){
        delete filterObj.category; 
    }

    
    console.log(req.query.popularity)

    Place.find(filterObj, function(err, places){
        if(err){
            console.log(err);
        }
        else {
            
            if(places.length<=0){
                req.flash("warning", "No places matched");
                res.render("places/placesList", {places: places, city:city, cityCap:cityCap, currentUser: req.user});
            }
            else {

                if (req.query.popularity == 'Rate'){

                    places.sort((a,b) => (a.ratingsAvg > b.ratingsAvg) ? -1 : ((b.ratingsAvg > a.ratingsAvg) ? 1 : 0));
                    res.render("places/placesList", {places: places, city:city, cityCap:cityCap, currentUser: req.user});
                    
                } else if (req.query.popularity == 'Popularity'){

                    places.sort((a,b) => (a.ratingsCount > b.ratingsCount) ? -1 : ((b.ratingsCount > a.ratingsCount) ? 1 : 0));
                    res.render("places/placesList", {places: places, city:city, cityCap:cityCap, currentUser: req.user});
                    
                } else {
                res.render("places/placesList", {places: places, city:city, cityCap:cityCap, currentUser: req.user});
                }
            }

        }
    });

});

router.get("/:city/places",  (req, res) => {

    var city = req.params.city;

    geocoder.geocode({googlePlaceId: city}, function(err, geores) {
        if (!err) {
            console.log("OK HERE");
            var cityCap = geores[0].formattedAddress;
            console.log(geores[0].formattedAddress);

            Place.find({"city": city}, function(err, places){
                if(err){
                    console.log(err);
                }
                else {
                    res.render("places/places", {places: places, city:city, cityCap:cityCap, currentUser: req.user});
                }
            })
        }else{
            console.log(err);
        }
    });

});

router.post("/:city/places", middleware.isLoggedIn, (req, res) => {

    var city = req.params.city;
    var name = req.body.name;
    var image = req.body.image;
    var description = req.body.description;
    var category = req.body.category;
    var author = {
        id: req.user._id,
        username: req.user.username
    };

    geocoder.geocode({googlePlaceId: city}, (err, cityData) => {
        
        if(err || !cityData.length) {
            req.flash("error", "Invalid adress");
            return res.redirect("back");
        } else {
            geocoder.geocode(req.body.location + ", " + cityData[0].formattedAddress, (err, data) => {

                if(err || !data.length) {
                    req.flash("error", "Invalid adress");
                    return res.redirect("back");
                }   
        
                var lat = data[0].latitude;
                var lng = data[0].longitude;
                var location = data[0].formattedAddress;
        
        
                var newPlace = {
                    city: city, 
                    name: name, 
                    image: image,
                    description: description,
                    author: author,
                    lat: lat,
                    lng: lng,
                    location: location,
                    category: category
                };
                
                Place.create(newPlace, function(err, place){
                    if(err){
                        console.log(err);
                    }
                    else {
                        res.redirect("/" + place.city + "/places")
                    }
                });
        
            });

        }

    });

});

router.get("/:city/places/new", middleware.isLoggedIn, (req, res) => {
    var city = req.params.city;
    var cityCap = toTitleCase(city);
    res.render("places/new", {city:city, cityCap: cityCap});
});

router.get("/:city/places/:id", function(req, res){
    var city = req.params.city;

    geocoder.geocode({googlePlaceId: city}, function(err, geores) {
        if(!err) {
            var cityTitle = geores[0].city;
            Place.findById(req.params.id).populate("comments").exec(function(err, place){
                if(err){
                    console.log(err);
                }
                else{
                    res.render("places/show", {place: place, cityTitle: cityTitle});
                }
            });
        }else{
            console.log(err)
            res.sendStatus(400);
        }
    });
});


// EDIT PLACE ROUTE
router.get("/:city/places/:id/edit", middleware.checkPlaceOwnership, (req, res) => {

    Place.findById(req.params.id, function(err, place){
        
        if(err){
            console.log(err)
        } else {
            res.render("places/edit", {place: place});
        }

    });

});

// UPDATE PLACE ROUTE
router.put("/:city/places/:id", middleware.checkPlaceOwnership, (req, res) => {


    geocoder.geocode(req.body.location, function(err, data){

        console.log(data)

        if(err || !data.length) {
            req.flash("error", "Invalid adress");
            return res.redirect("back");
        }   

        var lat = data[0].latitude;
        var lng = data[0].longitude;
        var location = data[0].formattedAddress;

        req.body.place.lat = lat;
        req.body.place.lng = lng;
        req.body.place.location = location;

        Place.findByIdAndUpdate(req.params.id, req.body.place, function(err, updatedPlace){
            if(err){
                res.redirect("/" + updatedPlace.city + "/places");
            } else {
                res.redirect("/" + updatedPlace.city + "/places/" + updatedPlace._id);
            }
        });

    });

});

router.put("/:city/places/:id", middleware.checkPlaceOwnership, (req, res) => {

    geocoder.geocode(req.body.location, function (err, data) {
        if (err || !data.length) {
            req.flash('error', 'Invalid address.');
            return res.redirect('back');
        }
        req.body.place.lat = data[0].latitude;
        req.body.place.lng = data[0].longitude;
        req.body.place.location = data[0].formattedAddress;
    
        Place.findByIdAndUpdate(req.params.id, req.body.place, function(err, updatedPlace){
            if(err){
                req.flash("error", err.message + ".");
                res.redirect("back");
            } else {
                req.flash("success","Successfully Updated!");
                res.redirect("/" + updatedPlace.city + "/places/" + updatedPlace._id);
            }
        });
    });
});

// DESTROY PLACE ROUTE
router.delete("/:city/places/:id", middleware.checkPlaceOwnership, (req, res) => {
    city = req.params.city
    Place.findByIdAndRemove(req.params.id, function(err, place){
        if (err) {
            req.flash("error", "Something went wrong.");
            res.redirect("/" + city + "/places");
        } else {
            req.flash("warning", "Place deleted.");
            res.redirect("/" + city + "/places");
        }
    });
});

function toTitleCase(string){
    // \u00C0-\u00ff for a happy Latin-1
    return string.toLowerCase().replace(/_/g, ' ').replace(/\b([a-z\u00C0-\u00ff])/g, function (_, initial) {
        return initial.toUpperCase();
    }).replace(/(\s(?:de|a|o|e|da|do|em|ou|[\u00C0-\u00ff]))\b/ig, function (_, match) {
        return match.toLowerCase();
    });
}

function escapeRegex(text){
    return text.replace(/[-[\]{}()*+?.,\\^$!#\s]/g, "\\$&")
};


module.exports = router