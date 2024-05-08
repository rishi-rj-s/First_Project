const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const UserDb = require("../model/usermodel");
const keys = require("./keys");

passport.serializeUser((user, done) => {
  done(null, user.id);
})

passport.deserializeUser((id, done) => {
  UserDb.findById(id).then((user) => {
    done(null, user);
  });
})

passport.use(
  new GoogleStrategy(
    {
      clientID: keys.google.clientID,
      clientSecret: keys.google.clientSecret,
      callbackURL: "/auth/redirect",
      // passReqToCallback   : true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if the user already exists in the database
        const currentUser = await UserDb.findOne({ email: profile._json.email });

        if (currentUser) {
          // User already exists, return the user
          done(null, currentUser);
        } else {
          // Generate a referral code for the new user
          async function generateRefCode() {
            const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            let code = "";
            for (let i = 0; i < 6; i++) {
              code += characters.charAt(Math.floor(Math.random() * characters.length));
            }

            // Check if the generated code already exists in the database
            const existingUser = await UserDb.findOne({ refCode: code });
            if (existingUser) {
              // If the code exists, recursively call the function to generate a new one
              return generateRefCode();
            }

            // Return the unique generated code
            return code.toUpperCase();
          }

          const refCode = await generateRefCode(); // Generate the refCode

          // Create a new user with the generated referral code
          const newUser = new UserDb({
            name: profile._json.name,
            email: profile._json.email,
            refCode: refCode,
          });

          // Save the new user to the database
          await newUser.save();

          // Return the new user
          done(null, newUser);
        }
      } catch (error) {
        console.error(error);
        done(error, null);
      }
    }
  )
);
