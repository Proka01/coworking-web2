const Pool = require('pg').Pool
var fs = require('fs');
require('dotenv').config({ path: '../.env' });

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


//selects info about user with passed wallet_address
const selectUser = (request, response) => {
    const { wallet_address } = request.body

    pool.query('SELECT (avatar) as result FROM users WHERE LOWER(wallet_address) = LOWER(($1))', [wallet_address], (error, selectResult) => {
        if (error) {
            throw error
        }

        if (selectResult.rowCount == 0) {
            response.status(200).send("[{\"result\": \"user not existing\"}]");
        }
        else
            response.status(208).send(selectResult.rows);
    })
}


//inserts user to db, with passed wallet address and avatar
const insertUser = (request, response) => {
    const { wallet_address, avatar } = request.body

    pool.query('INSERT INTO users (wallet_address, avatar) VALUES (LOWER($1), LOWER($2))', [wallet_address, avatar], (error, insertResult) => {
        if (error) {
            throw error
        }
        response.status(201).send(`User inserted successfully`)
    })
}


//updates avatar column for passed wallet_address
const updateAvatar = (request, response) => {
    const { wallet_address, avatar } = request.body

    pool.query(
        'UPDATE users SET avatar = $2 WHERE LOWER(wallet_address) = LOWER($1)', [wallet_address, avatar], (error, results) => {
            if (error) {
                throw error
            }
            response.status(200).send(`Avatar modified for user with wallet_address: ${wallet_address}`)
        }
    )
}


//deletes user from db with passed wallet_address
const deleteUser = (request, response) => {
    const { wallet_address } = request.body

    pool.query('DELETE FROM users WHERE LOWER(wallet_address) = LOWER($1)', [wallet_address], (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).send(`User deleted with wallet_address: ${wallet_address}`)
    })
}


module.exports = {
    selectUser,
    insertUser,
    updateAvatar,
    deleteUser
}