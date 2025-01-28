const express = require('express')
const db = require('../db')
const router = express.Router()
const sendErrorResponse = require('./toastResponse')

router.use(express.json())

router.post('/', (req, res) => {
    console.log('req', req.body);
    const { username, email, password, confirmPass } = req.body
    const tableName = `user_${username}`
    db.query(`SELECT EXISTS(
        SELECT 1 
        FROM pg_catalog.pg_tables 
        WHERE schemaname = 'admindata' 
        AND tablename = lower($1)
    )`, [tableName], (err, result) => {
        if (err) {
            console.log('Error while checking table existance' + err);
            sendErrorResponse(res, "Error", "Internal server error")
        }
        console.log('result.rows', result.rows[0].exists);
        if (result.rows[0].exists) {
            console.log(`Table admindata.${tableName} already exists.`);
            return sendErrorResponse(res.status(200), "Warning", "Account already exists")
        }
        else {
            db.query(`insert into admindata.users_summary(username,email,usertable,password)
                values($1,$2,$3,$4)`, [username, email, `user_${username}`, password], (err, result) => {
                if (err) {
                    console.log(`${err} ,Error while updating master table`);
                    return sendErrorResponse(res, "Error", "Internal server error")
                }

                db.query(`create table if not exists admindata.user_${username} (
            id serial primary key,
            username varchar(50) unique,
            data JSONB,
            email varchar(50) unique,
            created_at timestamp default now()
        )`, (err, result) => {
                    if (err) {
                        console.log('Error while creating table data ' + err);
                        sendErrorResponse(res, "Error", "Internal server error")
                    }
                    const userinitialData = {
                        username: username,
                        email: email
                    }
                    db.query(`insert into user_${username}(username,data,email)
                         values($1,$2,$3)`, [username, JSON.stringify(userinitialData), email], (err, result) => {
                        if (err) {
                            console.log('Error while inserting new table data' + err);
                            sendErrorResponse(res, "Error", "Internal server error")
                        }
                    })
                    sendErrorResponse(res.status(200), "Success", "Account created successfully")
                })
            })
        }
    })
})

module.exports = router