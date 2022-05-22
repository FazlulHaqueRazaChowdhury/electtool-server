//importing
const express = require("express");
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();


const port = process.env.PORT || 5000;
//middleware
app.use(cors());
app.use(express.json());



//mongodb

const uri = "mongodb+srv://fhrc:<password>@cluster0.9llnh.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// client.connect(err => {
//     const collection = client.db("test").collection("devices");
//     // perform actions on the collection object
//     client.close();
// });


//function run
async function run() {

    //collection of the product
    const productsCollection = client.db("electoold").collection('products');



    //getting all products
    app.get('/products', async (req, res) => {
        const query = {};
        const products = await productsCollection.find(query).toArray();
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