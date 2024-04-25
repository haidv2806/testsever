import express, { json, response} from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt"
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2"
import session from "express-session";
import env from "dotenv";
import axios from "axios";

// const https = require('https');
// const fs = require('fs');

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

// sử dụng bodyparser và express cho foder public
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// sử dụng cookie
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    }
  })
)

app.use(passport.initialize());
app.use(passport.session());

// const options = {
//     key: fs.readFileSync('private-key.pem'),
//     cert: fs.readFileSync('public-cert.pem')
//   };

// liên kết với cơ sở dữ liệu
const db = new pg.Client({
    // host: "postgres://dovanhai_user:myIGCZVQJx2KaTlvS76h7G9DkOO9rYVm@dpg-cohvh7f79t8c73891hm0-a.singapore-postgres.render.com/dovanhai",
    // host: "postgres://dovanhai_user:myIGCZVQJx2KaTlvS76h7G9DkOO9rYVm@dpg-cohvh7f79t8c73891hm0-a/dovanhai",
    // host: "dpg-cohvh7f79t8c73891hm0-a.singapore-postgres.render.com",
    port: 5432,
    // database: "dovanhai",
    // user: "dovanhai_user",
    // password: "myIGCZVQJx2KaTlvS76h7G9DkOO9rYVm",
    PGPASSWORD: "myIGCZVQJx2KaTlvS76h7G9DkOO9rYVm psql -h dpg-cohvh7f79t8c73891hm0-a.singapore-postgres.render.com -U dovanhai_user dovanhai"
//   user: "dovanhai_user",
//   host: "postgres://dovanhai_user:myIGCZVQJx2KaTlvS76h7G9DkOO9rYVm@dpg-cohvh7f79t8c73891hm0-a/dovanhai",
  
//   database: "dovanhai",
//   password: "myIGCZVQJx2KaTlvS76h7G9DkOO9rYVm",
//   port: 5432,
});
db.connect();


// Đọc chứng chỉ SSL/TLS từ tệp pem


// Tạo máy chủ HTTPS
// const server = https.createServer(options, (req, res) => {
//   res.writeHead(200);
//   res.end('Hello World!\n');
// });

// Lắng nghe trên cổng 443 (HTTPS)
// server.listen(443, () => {
//   console.log('Server is running on port 443');
// });


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });