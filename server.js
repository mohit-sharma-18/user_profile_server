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
const cookie = require('cookie-parser')
const sendErrorResponse = require('./apis/toastResponse.js')


app.use(express.json())
app.use(cors({
    origin: process.env.db_frontend,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}))
app.use(cookie())
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

            res.cookie('userEmail', email, {
                secure: process.env.node_env === 'production',
                httpOnly: true,
                maxAge: 3600000,
                sameSite: process.env.node_env === 'production' ? 'none' : 'lax'
            });
            console.log('email', email, 'req.session.user', req.session.user);
            return res.json({ "resPath": "/dashboard", "auth": true })
        }
        return sendErrorResponse(res, "Error", "Invalid login/password")

    })
})



app.get('/dashboard', (req, res) => {
    console.log('req.session', req.session);
    const userEmail = req.cookies.userEmail
    if (!userEmail) {
        return sendErrorResponse(res, 'Error', "Login First")
    }
    // const { email } = req.session.user;

    db.query(`select usertable from admindata.users_summary where upper(email)= upper($1)`, [userEmail], (err, result) => {
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
    const userEmail = req.cookies.userEmail
    db.query(`select usertable from admindata.users_summary where upper(email)= upper($1)`, [userEmail], (err, result) => {
        console.log('result', result.rows);
        if (err) {
            console.log('error while fetching data' + err);
            sendErrorResponse(res, 'Error', "Error while fetching data!")
        }
        const table = result.rows[0].usertable
        db.query(`
            update ${table}
                 set data = jsonb_set(data, '{${userData}}', '"${userValue}"') 
                 where id=1 and not (data ? $1)
                 returning id`, [userData], (err, result) => {
            if (err) {
                console.log('error while insert data' + err);
                sendErrorResponse(res, 'Error', "Error while insert data!")
            }
            else if (result.rowCount > 0) {
                return sendErrorResponse(res, 'Success', "Data added successfully")
            }
            else {
                return sendErrorResponse(res, 'Warning', "Data already exists");
            }

        })
    })

})

app.post('/deleteData', (req, res) => {
    const { userData, userValue } = req.body
    const userEmail = req.cookies.userEmail
    db.query(`select usertable from admindata.users_summary where upper(email)= upper($1)`, [userEmail], (err, result) => {
        console.log('result', result.rows);
        if (err) {
            console.log('error while fetching data' + err);
            sendErrorResponse(res, 'Error', "Error while fetching data!")
        }
        const table = result.rows[0].usertable
        db.query(`update ${table}
                 set data = data -$1
                 where id=1 and data ? $1
                 returning id,data`, [userData], (err, result) => {
                    console.log('www', result);
                    
            if (err) {
                console.log('error while insert data' + err);
                sendErrorResponse(res, 'Error', "Error while insert data!")
            }
            else if (result.rowCount > 0) {
                return sendErrorResponse(res, 'Success', "Data deleted successfully")
            }
            else {
                return sendErrorResponse(res, 'Warning', "No matching record found!");
            }
        })
    })

})

app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
})