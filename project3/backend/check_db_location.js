const mongoose = require('mongoose');
const User = require('./models/User');
const Message = require('./models/Message');
require('dotenv').config();

const cloudURI = process.env.MONGO_URI;

async function checkDB(uri) {
    console.log(`Checking CLOUD Database: ${uri}`);
    try {
        const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 }).asPromise();

        const UserModels = conn.model('User', User.schema);
        const MessageModels = conn.model('Message', Message.schema);

        const userCount = await UserModels.countDocuments();
        const messageCount = await MessageModels.countDocuments();

        console.log(`\n--- RESULTS ---`);
        console.log(`Users: ${userCount}`);
        console.log(`Messages: ${messageCount}`);
        console.log(`---------------`);

        if (userCount > 0 && messageCount === 0) {
            console.log("Analysis: Users exist, but no messages have been stored yet.");
        } else if (userCount === 0 && messageCount === 0) {
            console.log("Analysis: Database is completely empty.");
        }

        await conn.close();
    } catch (err) {
        console.log(`Failed to connect. Error:`, err.message);
    }
}

async function main() {
    if (cloudURI) {
        await checkDB(cloudURI);
    } else {
        console.log("No URI found in .env");
    }
    process.exit(0);
}

main();
