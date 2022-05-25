//importing
const express = require("express");
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { query } = require("express");
const nodemailer = require('nodemailer');
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_KEY);
const app = express();
var jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const access_token = process.env.ACCESS_TOKEN;
//middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const token = req.headers?.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).send({ message: 'Unauthorized Access' });
    }
    jwt.verify(token, access_token, function (error, decoded) {
        if (error) {

            return res.status(403).send({ message: 'Frobidden Access' })
        }

        req.decoded = decoded;
        next();
    })
}


//mongodb

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.9llnh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// client.connect(err => {
//     const collection = client.db("test").collection("devices");
//     // perform actions on the collection object
//     client.close();
// });

//email to me

const password = process.env.NODE_PASS;
const emailToMe = ({ info }) => {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'fozlulcoc1592@gmail.com',
            pass: password
        }
    });

    var mailOptions = {
        from: 'electool@gmail.com',
        to: 'fozlulcoc1592@gmail.com',
        subject: 'ElectTool Message',
        html: `<h2>ElectTool</h2>
                <div>
                <h2>Email: ${info.email}</h2>
                <p>Message: ${info.message}</p>
                <div>

        `
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

//function run
async function run() {
    client.connect();
    //collection of the product
    const productsCollection = client.db("electoold").collection('products');
    const userCollection = client.db('electoold').collection('users');
    const orderCollection = client.db('electoold').collection('orders');
    const reviewsCollection = client.db('electoold').collection('reviews');


    const verifyAdmin = async (req, res, next) => {
        const email = req.decoded.email;
        const user = await userCollection.findOne({ email: email });
        if (user.role === 'admin') {
            next()
        }
        else {
            res.status(403).send({ message: 'Forbidden' })
        }
    }

    //getting all products
    app.get('/products', async (req, res) => {
        const query = {};
        const productLimit = parseInt(req.query?.limit);
        const products = await productsCollection.find(query).sort({ _id: -1 }).limit(productLimit).toArray();
        res.send(products);
    })
    //updating product available
    app.patch('/products/:id', verifyJWT, async (req, res) => {
        const id = req.params?.id;
        if (id) {
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
        }
    })
    //getting product by its id
    app.get('/products/:id', verifyJWT, async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const filter = await productsCollection.findOne(query);
        res.send(filter);
    })
    //deleting a product by admin
    app.delete('/products/:id', verifyJWT, verifyAdmin, async (req, res) => {
        const id = req.params.id;
        const query = {
            _id: ObjectId(id)
        }
        const result = await productsCollection.deleteOne(query);
        res.send(result);
    })
    //adding a product
    app.post('/products', verifyJWT, verifyAdmin, async (req, res) => {
        const products = req.body;
        const result = await productsCollection.insertOne(products);
        res.send(result);
    })
    //updating a user if logged in and inserting a user if he signed up
    app.put('/users/:email', async (req, res) => {
        const email = req.params.email;
        if (email) {
            const token = jwt.sign({ email: email }, access_token, { expiresIn: '1d' });

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
            return res.send({ token: token });
        }
        return res.status(404).send({ message: 'Something went wrong' });
    })
    //updating user on the purchase page and on the my profile
    app.patch('/users/:email', verifyJWT, async (req, res) => {
        const email = req.decoded.email;

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
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
        const query = {};
        const filter = await userCollection.find(query).toArray();
        res.send(filter);
    })
    //getting user by email
    app.get('/users/:email', verifyJWT, async (req, res) => {
        const query = {
            email: req.decoded.email
        };
        const find = await userCollection.findOne(query);

        res.send(find);
    })
    //making an user admin
    app.patch('/makeAdmin/:id', verifyJWT, verifyAdmin, async (req, res) => {
        const id = req.params.id;
        const options = { upsert: false };
        const find = {
            _id: ObjectId(id)
        }
        const updateDoc = {
            $set: {
                role: 'admin'
            }
        }
        const filter = await userCollection.updateOne(find, updateDoc, options);
        res.send(filter);
    })
    //seeing if he is admin
    app.get('/admin/:email', verifyJWT, async (req, res) => {
        const email = req.params.email;

        const query = {
            email: email
        }
        const user = await userCollection.findOne(query);
        const isAdmin = user?.role === 'admin' ? true : false;
        res.send({ admin: isAdmin });

    })

    //adding orders 
    app.post('/orders/', verifyJWT, async (req, res) => {
        const orderInformation = req.body;
        const find = await orderCollection.findOne({ email: orderInformation.email, productID: orderInformation.productID, paid: false });
        if (find) {
            return res.send({ success: false, message: `Already have an order place for the same product` });
        }

        const result = await orderCollection.insertOne(orderInformation);
        res.send({ success: true, message: `Order Placed`, result });

    })
    //get all orders
    app.get('/orders', verifyJWT, verifyAdmin, async (req, res) => {
        const query = {};
        const result = await orderCollection.find(query).toArray();
        res.send(result)
    })
    //app get orders by email 
    app.get('/orders/:email', verifyJWT, async (req, res) => {

        const query = {
            email: req.decoded.email
        }
        const find = await orderCollection.find(query).toArray();
        res.send(find);
    })
    //app get a order by id
    app.get('/order/:id', verifyJWT, async (req, res) => {
        const id = req.params.id;
        const query = {
            _id: ObjectId(id),
        }
        const find = await orderCollection.findOne(query);

        if (find) {
            const findInProducts = await productsCollection.findOne({
                name: find.productName
            });
            if (!findInProducts) {
                const result = await orderCollection.deleteOne(query);
                return res.status(500).send({ message: 'Product is out of stock' });
            }
            res.send(find);
        }

    })
    //delete a order
    app.delete('/orders/:id', verifyJWT, async (req, res) => {

        const id = req.params.id;
        const query = {
            _id: ObjectId(id)
        }
        const deleting = await orderCollection.deleteOne(query);

        res.send(deleting);
    })
    //update order from payment
    app.patch('/order', verifyJWT, async (req, res) => {
        const id = req.body.orderId;
        const transcitionId = req.body.transcitionId;

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
    //update order patch
    app.patch('/orderStatus', verifyJWT, verifyAdmin, async (req, res) => {
        console.log(req.body);
        const id = req.body.id;
        const query = {
            _id: ObjectId(id)
        }
        const options = { upsert: false };
        const updateDoc = {
            $set: {
                status: 'shipped'
            }
        }
        const result = await orderCollection.updateOne(query, updateDoc, options);
        res.send(result);
    })
    //add a review 
    app.post('/reviews', verifyJWT, async (req, res) => {
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

    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
        const price = parseInt(req.query.price);
        const amount = price * 100;

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


    app.post('/email', async (req, res) => {
        const info = req.body;
        const information = {
            email: info.email,
            message: info.message
        }
        emailToMe(information);
        res.send({ message: 'Succesfull' })
    })
}
run()

app.get('/', (req, res) => {
    res.send('The server is running')
})

app.listen(port, () => {
    console.log('The server is running on port ', port);
})