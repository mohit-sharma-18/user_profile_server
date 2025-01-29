const express = require('express')
const app = express()
const signUp = require('./apis/signup.js')
const db = require('./db.js')
const cors = require('cors')
const port = 5000
const session = require('express-session')
const pgSession = require('connect-pg-simple')(session);
const pool = require('./db.js')
require('dotenv').config()
const sendErrorResponse = require('./apis/toastResponse.js')



app.use(express.json())
app.use(cors({
    origin: process.env.db_frontend,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}))
app.use('/signup', signUp)

app.use(
    session({
        store: new pgSession({
            pool: pool,
            tableName: 'session',
            createTableIfMissing: true,
        }),
        secret: process.env.secret_key,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.node_env === 'production',
            httpOnly: true,
            maxAge: 3600000,
            sameSite: process.env.node_env === 'production' ? 'none' : 'lax'
        }
    })
);

app.post('/set-cookie', (req, res) => {
    res.cookie('testCookie', 'helloWorld', {
        httpOnly: true,   // Prevents JavaScript access
        secure: true,     // Ensures cookies are sent over HTTPS
        sameSite: 'None', // Allows cross-origin requests
        maxAge: 3600000   // 1 hour expiration
    });
    res.send('Cookie set!');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body
    console.log(email, password);

    db.query('select * from admindata.users_summary where upper(email) = upper($1) AND password = $2', [email, password], (err, result) => {
        if (err) {
            console.log('Error while fetching data ' + err);
            return sendErrorResponse(res, "Error", "Internal Server Error")
        }
        if (result.rows.length == 0) {
            return sendErrorResponse(res, "Error", "Invalid login/password")
        }
        if (email.toUpperCase() === result.rows[0].email.toUpperCase()) {
            if (!req.session) {
                return sendErrorResponse(res, "Error", "Session Not Initilaize")
            }
            req.session.user = { email }
            
            res.cookie('sessionId', req.sessionID, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                maxAge: 3600000,
            });
            console.log('email', email, 'req.session.user', req.session.user);
            return res.json({ "resPath": "/dashboard", "auth": true })
        }
        return sendErrorResponse(res, "Error", "Invalid login/password")

    })
})



app.get('/dashboard', (req, res) => {
    console.log('req.session', req.session);

    if (!req.session.user) {
        return sendErrorResponse(res, 'Error', "Login First")
    }
    const { email } = req.session.user;

    db.query(`select usertable from admindata.users_summary where upper(email)= upper($1)`, [email], (err, result) => {
        console.log('result', result.rows);
        if (err) {
            console.log('error while fetching data' + err);
            sendErrorResponse(res, 'Error', "Error while fetching data!")
        }
        const table = result.rows[0].usertable
        db.query(`select data from ${table}`, (err, result) => {
            if (err) {
                console.log('error while fetching data' + err);
                sendErrorResponse(res, 'Error', "Error while fetching data!")
            }
            console.log('---', result.rows);

            return res.json(result.rows)
        })
    })
    // return sendErrorResponse(res.status(200), 'Warning', 'No data found')
})

app.post('/addData', (req, res) => {
    const { userData, userValue } = req.body
    const { email } = req.session.user
    db.query(`select usertable from admindata.users_summary where upper(email)= upper($1)`, [email], (err, result) => {
        console.log('result', result.rows);
        if (err) {
            console.log('error while fetching data' + err);
            sendErrorResponse(res, 'Error', "Error while fetching data!")
        }
        const table = result.rows[0].usertable
        db.query(`update ${table}
                 set data = jsonb_set(data, '{${userData}}', '"${userValue}"') 
                 where id=1`, [], (err, result) => {
            if (err) {
                console.log('error while insert data' + err);
                sendErrorResponse(res, 'Error', "Error while insert data!")
            }

            return sendErrorResponse(res, 'Success', "Data added successfully")
        })
    })

})

app.post('/deleteData', (req, res) => {
    const { userData, userValue } = req.body
    const { email } = req.session.user
    db.query(`select usertable from admindata.users_summary where upper(email)= upper($1)`, [email], (err, result) => {
        console.log('result', result.rows);
        if (err) {
            console.log('error while fetching data' + err);
            sendErrorResponse(res, 'Error', "Error while fetching data!")
        }
        const table = result.rows[0].usertable
        db.query(`update ${table}
                 set data = data -$1
                 where id=1`, [userData], (err, result) => {
            if (err) {
                console.log('error while insert data' + err);
                sendErrorResponse(res, 'Error', "Error while insert data!")
            }
            return sendErrorResponse(res, 'Success', "Data deleted successfully")
        })
    })

})

app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
})