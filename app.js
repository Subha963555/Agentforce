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

// PUT update account by Salesforce Id via URL params
app.put('/updateAccount', async (req, res) => {
    const sfAccountId = req.query.sfId;
    const accountName = req.query.accountName;
    const accountEmail = req.query.accountEmail;
    const phone = req.query.phone;

    if (!sfAccountId) {
        return res.status(400).send('Missing Salesforce Id (sfId)');
    }

    const updatedData = {
        ...(accountName && { accountName }),
        ...(accountEmail && { accountEmail }),
        ...(phone && { phone })
    };

    const result = await accounts.updateOne(
        { sfAccountId: sfAccountId },
        { $set: updatedData }
    );

    if (result.matchedCount === 0) {
        return res.status(404).send('No record found with this Salesforce Id');
    }

    res.json({ modifiedCount: result.modifiedCount });
});

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

// POST create new account (corrected to accept sfAccountId)
app.post('/accounts', async (req, res) => {
    const { sfAccountId, accountName, accountEmail, phone } = req.body;

    if (!accountName || !accountEmail || !phone) {
        return res.status(400).send('Missing required fields: accountName, accountEmail, or phone');
    }

    const accountDocument = {
        ...(sfAccountId && { sfAccountId }),
        accountName,
        accountEmail,
        phone
    };

    const result = await accounts.insertOne(accountDocument);
    res.json({ insertedId: result.insertedId });
});

// INSERT or UPDATE via GET with URL query parameters (upsert)
app.get('/insertAccount', async (req, res) => {
    const { sfAccountId, accountName, accountEmail, phone } = req.query;

    if (!sfAccountId || !accountName || !accountEmail || !phone) {
        return res.status(400).send('Missing required fields');
    }

    const accountDocument = {
        sfAccountId,
        accountName,
        accountEmail,
        phone
    };

    const result = await accounts.updateOne(
        { sfAccountId: sfAccountId },
        { $set: accountDocument },
        { upsert: true }
    );

    if (result.upsertedCount > 0) {
        res.send(`Inserted new account with SF ID: ${sfAccountId}`);
    } else if (result.modifiedCount > 0) {
        res.send(`Updated existing account with SF ID: ${sfAccountId}`);
    } else {
        res.send(`No changes made for account with SF ID: ${sfAccountId}`);
    }
});

// PUT update account by MongoDB _id
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
