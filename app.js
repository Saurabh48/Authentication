require('dotenv').config();
const express = require("express");
const bodyparser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate")

const app = express();

app.use(bodyparser.urlencoded({
    extended: true
}));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(session({
    secret: "nomoresecret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    secrets: [String]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user._id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        if (!err) done(null, user);
        else done(err, null)
    })
});

passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets"
    },
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({
            googleId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });
    }
));

const invalidString = "Invalid username or password! please try again."
const registerString = "You have already registered! please log in."

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/auth/google",
    passport.authenticate("google", {
        scope: ["profile"]
    }));

app.get("/auth/google/secrets",
    passport.authenticate("google", {
        failureRedirect: "/login"
    }),
    function (req, res) {
        res.redirect("/secrets");
    });

app.get("/login", function (req, res) {
    res.render("login", {
        falsestring: ""
    });
});

app.get("/register", function (req, res) {
    res.render("register", {
        falsestring: ""
    });
});

app.get("/secrets", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("secrets",{userSecrets: req.user.secrets});
    } else {
        res.render("login", {
            falsestring: "Please log in first!"
        });
    }
});

app.get("/submit", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.render("login", {
            falsestring: "Please log in first!"
        });
    }
});

app.post("/submit",function(req,res){
   User.updateOne({_id: req.user.id},{$push: {secrets: req.body.secret}},function(err){
       if(!err)
       {
            res.redirect("/secrets");
       }
       else
       {
           console.log(err);
       }
   }) 
})

app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});

app.post("/register", function (req, res) {
    User.register({
        username: req.body.username
    }, req.body.password, function (err, user) {
        if (!err) {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        } else {
            console.log(err);
            res.render("register", {
                falsestring: registerString
            });
        }
    });
});

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function (err) {
        if (!err) {
            passport.authenticate("local", function (err, user) {
                if (!err) {
                    if (user) {
                        passport.authenticate("local")(req, res, function () {
                            res.redirect("/secrets");
                        });
                    } else {
                        res.render("login", {
                            falsestring: invalidString
                        });
                    }
                } else {
                    console.log(err);
                }
            })(req, res);
        } else {
            console.log(err);
        }
    })
});

app.listen(3000, function (req, res) {
    console.log("server has started successfully");
});