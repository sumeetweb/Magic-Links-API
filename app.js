const config = require('./config/config.js');
const SECRET = "ASKBFKHASBFLKABFYe3g823879e73hdiBSDHBaSUYdfg38gr83";
const PORT = process.env.PORT || 3000;

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const nodeMailer = require('nodemailer');
const https = require('https');
const fs = require('fs');
const path = require('path');
const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'config/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'config/cert.pem'))
};

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/send_magic_link', (req, res) => {
    /*
    *  Check local db for a 'sub' that matches the email
    */

    const sub = 'sumeetweb';
    if(req.body.email){
        const token = jwt.sign({
            "iss":"MagicLinkServer",
            "exp":Math.floor(Date.now()/1000) + (60*10),
            "sub":sub,
            "nonce":Math.floor(Math.random()*1000000),
        }, SECRET);
        
        console.log(token);

        const transporter = nodeMailer.createTransport({
            host: config.mail.host,
            port: config.mail.port,
            secure: config.mail.secure,
            auth: {
                user: config.mail.user,
                pass: config.mail.pass
            }
        });

        const mailOptions = {
            from: '"MagicLinkServer" <magiclinkserver@foobar.com>',
            to: req.body.email,
            subject: 'Login to App via Magic Link',
            html:
            `<p>Click the link below to login to the app.</p>
            <a href="${config.app.url}/login?token=${token}">${config.app.url}/authenticate?token=${token}</a>`
        }

        transporter.sendMail(mailOptions, (err, info) => {
            if(err){
                console.log(err);
                res.status(500).send("Error sending email");
            } else {
                console.log(info);
                res.status(200).send("Email Sent Successfully.");
            }
        })

        res.status(200).end();
    }
    else {
        throw new Error("Invalid Email");
    }
});

/*
    Parameter ?token=akshbhasbkasndljlk
*/
app.get('/authenticate_user', (req, res) => {
    
    if(req.query.token){
        const token = req.query.token;
        try{
            const decoded = jwt.verify(token, SECRET);
            console.log(decoded);

            /*
            *  Use 'sub' to fetch user info. from db
            */

            const user_info = {
                email: "sumeet@xyz.com",
                name : "Sumeet",
                sub: decoded.sub
            };

            /*
                Create a session_id and associate with the sub of the user
            */
            const session_id = 'kiacbka';
            res.cookie('session_id', session_id, {httpOnly: true, secure: true});
            res.cookie('sub', user_info.sub, {httpOnly: true, secure: true});
            
            res.redirect('/welcome');
            res.status(200).end();
        } catch(err){
            throw new Error(err.message);
        }
    } else {
        throw new Error("No Token");
    }
});

app.get('/welcome', (req, res) => {
    res.status(200).send(
        `<h1>Welcome ${req.cookies.sub}</h1>`
    );
});

app.use((req, res, next) => {
    const err = new Error('Route Not Found.');
    err.status = 404;
    throw err;
});

app.use((err, req, res, next) => {
    res.clearCookie('sub');
    res.clearCookie('sessionid');
    res.status(err.status || 500).send(err.message || 'Internal Server Error');
});

https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});