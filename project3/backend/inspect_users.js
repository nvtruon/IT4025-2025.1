const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/secure_chat';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('Connected to DB');
        const users = await User.find({}, 'username displayName');
        console.log('--- USERS IN DB ---');
        users.forEach(u => {
            console.log(`User: ${u.username.substring(0, 10)}... | Name: "${u.displayName}"`);
        });
        console.log('-------------------');
        mongoose.disconnect();
    })
    .catch(err => console.error(err));
