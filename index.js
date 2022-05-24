//importing
const express = require("express");
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { query } = require("express");
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_KEY);
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
    const orderCollection = client.db('electoold').collection('orders');
    const reviewsCollection = client.db('electoold').collection('reviews');

    //getting all products
    app.get('/products', async (req, res) => {
        const query = {};
        const productLimit = parseInt(req.query.limit);
        const products = await productsCollection.find(query).sort({ _id: -1 }).limit(productLimit).toArray();
        res.send(products);
    })
    //updating product available
    app.patch('/products/:id', async (req, res) => {
        const id = req.params.id;

        const available = req.body.available;
        const filter = {
            _id: ObjectId(id)
        }
        const option = { upsert: false };
        const updateDoc = {
            $set: {
                available: available,
            },
        };
        const result = await productsCollection.updateOne(filter, updateDoc, option);
        res.send(result);
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
                },
            };

            const result = await userCollection.updateOne(query, updateDoc, options);
            return res.send(result);
        }
        return res.status(404).send({ message: 'Something went wrong' });
    })
    //updating user on the purchase page and on the my profile
    app.patch('/users/:email', async (req, res) => {

        const email = req.params.email;

        const query = {
            email: email
        }
        const information = req.body;
        const options = { upsert: false };
        const updateDoc = {
            $set: {
                photoURL: information.photoURL,
                name: information.name,
                email: information.email,
                street: information.street,
                city: information.city,
                country: information.country,
                zip: information.zip,
                phone: information.phone,
            },

        };
        const result = await userCollection.updateOne(query, updateDoc, options);
        res.send(result);

    })
    //getting all user 
    app.get('/users', async (req, res) => {
        const query = {};
        const filter = await userCollection.find(query).toArray();
        res.send(filter);
    })
    //getting user by email
    app.get('/users/:email', async (req, res) => {
        const query = {
            email: req.params.email
        };
        const find = await userCollection.findOne(query);

        res.send(find);
    })
    //adding orders 
    app.post('/orders/', async (req, res) => {
        const orderInformation = req.body;
        const find = await orderCollection.findOne({ email: orderInformation.email, productID: orderInformation.productID, paid: false });

        if (find) {
            return res.send({ success: false, message: `Already have an order place for the same product` });
        }

        const result = await orderCollection.insertOne(orderInformation);
        res.send({ success: true, message: `Order Placed` });

    })
    //get all orders
    app.get('/orders', async (req, res) => {
        const query = {};
        const result = await orderCollection.find(query).toArray();
        res.send(result)
    })
    //app get orders by email 
    app.get('/orders/:email', async (req, res) => {
        const query = {
            email: req.params.email
        }
        const find = await orderCollection.find(query).toArray();
        res.send(find);
    })
    //app get a order by id
    app.get('/order/:id', async (req, res) => {
        const id = req.params.id;

        const query = {
            _id: ObjectId(id),
        }
        const find = await orderCollection.findOne(query);
        res.send(find);

    })
    //delete a order
    app.delete('/orders/:id', async (req, res) => {

        const id = req.params.id;
        const query = {
            _id: ObjectId(id)
        }
        const deleting = await orderCollection.deleteOne(query);

        res.send(deleting);
    })
    //update order from payment
    app.patch('/order', async (req, res) => {
        const id = req.body.orderId;
        const transcitionId = req.body.transcitionId;
        console.log(transcitionId);
        const filter = {
            _id: ObjectId(id)
        }
        const option = { upsert: false };
        const updateDoc = {
            $set: {
                paid: true,
                transcitionId: transcitionId
            }
        }
        const result = await orderCollection.updateOne(filter, updateDoc, option);
        res.send(result);
    })
    //add a review 
    app.post('/reviews', async (req, res) => {
        const review = req.body;
        const upload = await reviewsCollection.insertOne(review);
        res.send(upload);
    })
    //get review
    app.get('/reviews', async (req, res) => {
        const query = {};
        const find = await reviewsCollection.find(query).sort({ _id: -1 }).toArray();
        res.send(find);
    })
    //creating payment intent

    app.post("/create-payment-intent", async (req, res) => {
        const price = parseInt(req.query.price);
        const amount = price * 100;
        console.log(amount);
        if (amount) {
            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        }
    });
}
run()

app.get('/', (req, res) => {
    res.send('The server is running')
})

app.listen(port, () => {
    console.log('The server is running on port ', port);
})