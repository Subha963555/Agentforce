require('dotenv').config();  // <-- Load env variables

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Middleware
app.use(cors());
app.use(bodyParser.json());

async function connectDB() {
    await client.connect();
    console.log('Connected to MongoDB');
}

const database = client.db('accountDB');
const accounts = database.collection('account');

// Routes

// GET all accounts
app.get('/accounts', async (req, res) => {
    const allAccounts = await accounts.find().toArray();
    res.json(allAccounts);
});

// GET single account by id
app.get('/accounts/:id', async (req, res) => {
    const id = req.params.id;
    const account = await accounts.findOne({ _id: new ObjectId(id) });
    res.json(account);
});

// POST create new account
app.post('/accounts', async (req, res) => {
    const accountData = req.body;
    const result = await accounts.insertOne(accountData);
    res.json({ insertedId: result.insertedId });
});

// INSERT via GET with URL query parameters
app.get('/insertAccount', async (req, res) => {
    const { accountName, accountEmail, phone } = req.query;

    if (!accountName || !accountEmail || !phone) {
        return res.status(400).send('Missing required fields');
    }

    const accountDocument = {
        accountName,
        accountEmail,
        phone
    };

    const result = await accounts.insertOne(accountDocument);
    res.send(`Inserted account with ID: ${result.insertedId}`);
});

// PUT update account by id
app.put('/accounts/:id', async (req, res) => {
    const id = req.params.id;
    const updatedData = req.body;

    const result = await accounts.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
    );

    res.json({ modifiedCount: result.modifiedCount });
});

// Start server
app.listen(port, async () => {
    await connectDB();
    console.log(`Server running on http://localhost:${port}`);
});
