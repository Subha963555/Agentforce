require('dotenv').config();  // Load environment variables

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection URI from environment variable
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

app.use(cors());
app.use(bodyParser.json());

async function connectDB() {
    await client.connect();
    console.log('Connected to MongoDB');
}

const database = client.db('accountDB');
const accounts = database.collection('account');

// PUT update account by Salesforce Id via URL query parameters
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

    try {
        const result = await accounts.updateOne(
            { sfAccountId: sfAccountId },
            { $set: updatedData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send('No record found with this Salesforce Id');
        }

        res.json({ modifiedCount: result.modifiedCount });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating account');
    }
});

// GET all accounts
app.get('/accounts', async (req, res) => {
    try {
        const allAccounts = await accounts.find().toArray();
        res.json(allAccounts);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching accounts');
    }
});

// GET single account by MongoDB _id
app.get('/accounts/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const account = await accounts.findOne({ _id: new ObjectId(id) });
        if (!account) {
            return res.status(404).send('Account not found');
        }
        res.json(account);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching account');
    }
});

// POST create new account - requires accountName, accountEmail, phone, optional sfAccountId
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

    try {
        const result = await accounts.insertOne(accountDocument);
        res.json({ insertedId: result.insertedId });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error inserting account');
    }
});

app.post('/insertAccount', async (req, res) => {
    const { sfAccountId, accountName, accountEmail, phone } = req.body;

    console.log('InsertAccount POST called with body:', req.body);

    if (!sfAccountId || !accountName || !accountEmail || !phone) {
        return res.status(400).send('Missing required fields: sfAccountId, accountName, accountEmail, or phone');
    }

    const accountDocument = {
        sfAccountId: String(sfAccountId),
        accountName: String(accountName),
        accountEmail: String(accountEmail),
        phone: String(phone)
    };

    try {
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
    } catch (error) {
        console.error('Error upserting account:', error);
        res.status(500).send('Error upserting account');
    }
});

// PUT update account by MongoDB _id
app.put('/accounts/:id', async (req, res) => {
    const id = req.params.id;
    const updatedData = req.body;

    try {
        const result = await accounts.updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedData }
        );
        res.json({ modifiedCount: result.modifiedCount });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating account');
    }
});

// Start server and connect to DB
app.listen(port, async () => {
    await connectDB();
    console.log(`Server running on http://localhost:${port}`);
});
