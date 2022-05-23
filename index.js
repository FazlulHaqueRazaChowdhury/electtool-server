//importing
const express = require("express");
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;
//middleware
app.use(cors());
app.use(express.json());



//mongodb

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.9llnh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// client.connect(err => {
//     const collection = client.db("test").collection("devices");
//     // perform actions on the collection object
//     client.close();
// });


//function run
async function run() {
    client.connect();
    //collection of the product
    const productsCollection = client.db("electoold").collection('products');
    const userCollection = client.db('electoold').collection('users');


    //getting all products
    app.get('/products', async (req, res) => {
        const query = {};
        const productLimit = parseInt(req.query.limit);
        const products = await productsCollection.find(query).sort({ _id: -1 }).limit(productLimit).toArray();
        res.send(products);
    })
    //getting product by its id
    app.get('/products/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const filter = await productsCollection.findOne(query);
        res.send(filter);
    })
    //updating a user if logged in and inserting a user if he signed up
    app.put('/users/:email', async (req, res) => {
        const email = req.params.email;
        if (email) {
            const query = {
                email: email
            }
            const information = req.body;
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    photoURL: information.photoURL,
                    name: information.name,
                    email: information.email,
                    street: information.street,
                    city: information.city,
                    country: information.country,
                    zip: information.zip,
                },
            };
            const result = await userCollection.updateOne(query, updateDoc, options);
            return res.send(result);
        }
        return res.status(404).send({ message: 'Something went wrong' });
    })
    //getting all user 
    app.get('/users', async (req, res) => {
        const query = {};
        const filter = await userCollection.find(query).toArray();
        res.send(filter);
    })
}
run()

app.get('/', (req, res) => {
    res.send('The server is running')
})

app.listen(port, () => {
    console.log('The server is running on port ', port);
})