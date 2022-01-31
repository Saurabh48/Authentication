require('dotenv').config();
const express = require("express");
const bodyparser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.use(bodyparser.urlencoded({
    extended: true
}));
app.use(express.static("public"));
app.set("view engine", "ejs");

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);

const invalidString = "Invalid username or password! please try again."

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/login", function (req, res) {
    res.render("login", {
        falsestring: ""
    });
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.post("/register", function (req, res) {
    const user = new User({
        email: req.body.username,
        password: req.body.password
    });
    user.save(function (err) {
        if (!err) {
            res.render("secrets");
        } else {
            console.log(err);
        }
    });
});

app.post("/login", function (req, res) {
    User.findOne({
        email: req.body.username
    }, function (err, foundEmail) {
        if (!err) {
            if (foundEmail) {
                if (foundEmail.password === req.body.password) {
                    res.render("secrets");
                } else {
                    res.render("login", {
                        falsestring: invalidString
                    });
                }
            } else {
                res.render("login", {
                    falsestring: invalidString
                });
            }
        } else {
            console.log(err);
        }
    })
});

app.listen(3000, function (req, res) {
    console.log("server has started successfully");
})