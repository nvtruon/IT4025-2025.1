const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Adjust path to .env

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/secure_chat';

const resetDb = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log(`Connected to ${MONGO_URI}`);

        const collections = await mongoose.connection.db.collections();

        for (let collection of collections) {
            const name = collection.collectionName;
            if (name === 'users' || name === 'messages') {
                console.log(`Dropping collection: ${name}`);
                await collection.drop();
            }
        }

        console.log('✅ Database reset successfully!');
    } catch (error) {
        console.error('❌ Error resetting database:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

resetDb();
