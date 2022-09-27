const Pool = require('pg').Pool
var fs = require('fs');
require('dotenv').config({ path: '../.env' });
const mailClient = require('./mail_api');


//db parameters
const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
    ssl: {
        ca: fs.readFileSync('ca-certificate.crt')
    }
})


//select redeemer for ticket if exist
//if not "Not redeemed" is returned
const selectEmail = (request, response) => {
    const { hash } = request.body

    pool.query('SELECT COALESCE(email, \'Not redeemed\') AS result FROM tickets where id= $1', [hash], (error, results) => {
        if (error) {
            throw error
        }

        if (results.rowCount > 0)
            response.status(200).send(results.rows)
        else
            response.status(200).send("[{\"result\": \"no_hashes\"}]")
    })
}


//inserting ticket into db, unless it already exists
//if ticket exists and someone redeemed it, insertion should not happen (because of Web3 implementation)
const insertTicket = (request, response) => {
    const { hash, endDate } = request.body

    pool.query('SELECT (id, end_date, email) FROM tickets WHERE id = ($1)', [hash], (error, selectResult) => {
        if (error) {
            throw error
        }

        if (selectResult.rowCount == 0) {

            const rand = Math.floor(Math.random() * (1000000 - 100000) + 100000); //rand in range [100000, 999999]
            pool.query('INSERT INTO tickets (id, end_date, code) VALUES ($1, $2, $3)', [hash, endDate, rand], (error, insertResult) => {
                if (error) {
                    throw error
                }
                response.status(201).send(`Ticket inserted successfully`)
            })
        }
        else
            response.status(208).send('Ticket already exists')
    })
}


//deleting ticket from db
const deleteTicket = (request, response) => {
    const { hash } = request.body

    pool.query('DELETE FROM tickets WHERE id = $1', [hash], (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).send(`User deleted with ID: ${hash}`)
    })
}


//sending verification code for redeeming ticket
async function sendCodeToEmail(request, response) {
    const { email, hash } = request.body

    pool.query('SELECT code FROM tickets where id= $1', [hash], (error, results) => {
        if (error) {
            throw error
        }

        if (results.rowCount > 0) {
            response.status(200).send("Code sent to email successfully");
            mailClient.sendVerificationCodeToMail(email, results.rows[0].code);
        }
        else
            response.status(200).send("Sending code failed");
    })
}


//checking if user entered valid code and sending ticket to mail
//ticket is not redeemed if email == NULL
const checkVerificationCode = (request, response) => {
    const { code, hash, email } = request.body

    pool.query('SELECT code, TO_CHAR(end_date, \'dd/mm/yyyy\') AS result FROM tickets where code = $1 AND id = $2 AND email is NULL', [code, hash], (error, results) => {
        if (error) {
            throw error
        }

        if (results.rowCount > 0) {
            pool.query(
                'UPDATE tickets SET email = $1 WHERE id = $2 AND email is null', [email, hash], (error, results) => {
                    if (error) {
                        throw error
                    }
                    response.status(200).send(`Ticket modified with ID: ${hash}`)
                }
            )
            mailClient.sendTicketToEmail(email, hash, results.rows[0].result);
        }
        else
            response.status(202).send("[{\"result\": \"invalid_code or already redeemed\"}]")
    })

}


module.exports = {
    insertTicket,
    deleteTicket,
    selectEmail,
    sendCodeToEmail,
    checkVerificationCode
}