//jshint esversion:6 hello
require('dotenv').config();
var _ = require('lodash');
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate'); 
const app = express();
 

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({   extended: true }));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

//const MongoClient = require('mongodb').MongoClient
//MongoClient.connect(url, { useNewUrlParser: true });
mongoose.connect(  process.env.MONGODB_ID, {useNewUrlParser: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({
  name : String,
  email: String,
  password: String,
  breed: String,
  googleId: String,
  secret: [{
    type: String,
    required: [true, "Please Add description"],
  }],
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://cryptic-scrubland-24755.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/about", function(req, res){
  res.render("about");
});

app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  
  console.log(req.files);
  const submittedSecret = req.body.secret;
  const dogname = req.body.name;
  const breed = req.body.breed;

//Once the user is authenticated and their session gets saved, their user details are saved to req.user.

  User.findById(req.user.id, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
         foundUser.secret.push(submittedSecret);

         if(dogname !== '') foundUser.name = dogname;
         if(breed !== '') foundUser.breed = breed;
        
          foundUser.save(function(){
           res.redirect("/secrets");
         });

      }
       
    }
  });
});

app.get("/profile", function(req, res){


  if (req.isAuthenticated()){

    User.findById(req.user.id, function(err, foundUser){
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          res.redirect("/profile/" + foundUser.name );

        }
      }
    });

  } else {
    res.redirect("/login");
  }
})

app.get("/profile/:name", function(req, res){
  var x = _.lowerCase(req.params.name);
 User.findOne({name: x}, function(err, founduser ){
   if(err) console.log(err);
   else{
     if(!founduser)   res.send("Not exist");
     else res.render("profile", {ourname : founduser.name } );
   }
 })



});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/login");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password,
    name : null
  });

  req.login(user, function(err){
    if (err) {
       console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/submit");
      });
    }
  });

});



app.listen( process.env.PORT  || 3000, function() {
  console.log("Server started on port 3000.");
});

// User.find(function(err, ouruser){
//   if(err) console.log(err);
//   else {
//     ouruser.forEach(function(iuser){
//       console.log(iuser.username);
//     })
//   }
// })
//     res.send("sdfs");
//   })
