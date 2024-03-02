const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const UserDb = require("../model/usermodel");
const keys = require("./keys");

passport.serializeUser((user,done)=>{
  done(null, user.id);
})

passport.deserializeUser((id,done)=>{
  UserDb.findById(id).then((user)=>{
    done(null, user);
  });
})

passport.use(
  new GoogleStrategy(
    {
      clientID: keys.google.clientID,
      clientSecret: keys.google.clientSecret,
      callbackURL: "http://localhost:5002/auth/redirect",
      // passReqToCallback   : true
    },
    (accessToken, refreshToken, profile, done) => {
      //check if user exists
      // console.log(profile)
      UserDb.findOne({ email: profile._json.email }).then((currentUser) => {
        if (currentUser) {
          //already have user
          // console.log('User is: ', currentUser, profile);
          done(null, currentUser);
        } else {
          //create a new user
          new UserDb({
            name: profile._json.name,
            // googleId: profile.id,
            email: profile._json.email,
          })
            .save()
            .then((newUser) => {
              // console.log("New User created: " + newUser);
              done(null, newUser)
            });
        }
      });
    }
  )
);
