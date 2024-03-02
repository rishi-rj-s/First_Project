const express = require('express')
const dotenv = require('dotenv')
const path = require('path')
const nocache = require('nocache')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const passportSetup = require('./auth/passport-setup')


const connectDB = require('./database/connection')

const app = express();

dotenv.config({path: 'config.env'})
const port = process.env.PORT

app.use(cookieParser());
app.use(nocache())

app.use(session({
     secret: 'your-secret-key',
     resave: false,
     saveUninitialized: true,
}));

app.listen(port,()=>{
     console.log(`Server @ http://localhost:${port}`)
})

app.use('/css', express.static(path.join(__dirname,"public/css")))
app.use('/img', express.static(path.join(__dirname,"public/img")))
app.use('/js', express.static(path.join(__dirname,"public/js")))
app.use('/uploads',express.static('uploads'))

app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({extended:true}))

//login page
app.get("/",(req,res)=>{
     if(req.cookies.token){
          res.redirect('/admin/dashboard')
     }
     else if(req.cookies.access){
          res.redirect("/user/landing")
     }else{
          res.render('user/login')
     }
})

//load routers
app.use('/user', require('./routes/user'))
app.use('/admin',require('./routes/admin'))
app.use('/auth',require('./routes/auth'))

//mongodb connection
connectDB()