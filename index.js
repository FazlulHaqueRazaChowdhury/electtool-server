//importing
const express = require("express");
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
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



    //getting all products
    app.get('/products', async (req, res) => {
        const query = {};
        const productLimit = parseInt(req.query.limit);
        const products = await productsCollection.find(query).sort({ _id: -1 }).limit(productLimit).toArray();
        res.send(products);
    })
}
run()

app.get('/', (req, res) => {
    res.send('The server is running')
})

app.listen(port, () => {
    console.log('The server is running on port ', port);
})