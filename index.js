const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.port || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// middleware

app.use(cors())
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lyyi68r.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();


        const packagesCollection = client.db("TouristDb").collection("packages");
        const reviewCollection = client.db("TouristDb").collection("reviews");
        const guidesCollection = client.db("TouristDb").collection("guides");
        const bookingCollection = client.db("TouristDb").collection("booking");
        const tBookingCollection = client.db("TouristDb").collection("tBooking");
        const wishCollection = client.db("TouristDb").collection("wish");
        const userCollection = client.db("TouristDb").collection("users");
        const paymentCollection = client.db("TouristDb").collection("payments");


        // app.post('/jwt', async (req, res) => {
        //     const user = req.body;
        //     const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        //     res.send({ token });
        // })

        // middlewares 
        const verifyToken = (req, res, next) => {
            // console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
              return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
              if (err) {
                return res.status(401).send({ message: 'unauthorized access' })
              }
              req.decoded = decoded;
              next();
            })
          }

        // use verify admin after verifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }

        // users related api
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        })
        app.get('/users/TGuide/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let TGuide = false;
            if (user) {
                TGuide = user?.role === 'TGuide';
            }
            res.send({ TGuide });
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.patch('/users/TGuide/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'TGuide'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/packages', async (req, res) => {
            const result = await packagesCollection.find().toArray();
            res.send(result);
        })
        app.post('/packages', async (req, res) => {
            const newPack = req.body;
            console.log(newPack);
            const result = await packagesCollection.insertOne(newPack);
            res.send(result);
        })

        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })

        app.get('/guides', async (req, res) => {
            const cursor = guidesCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })
        app.get('/guides/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await guidesCollection.findOne(query);
            res.send(result)
        })
        app.post('/guides', async (req, res) => {
            const newGuides = req.body;
            console.log(newGuides);
            const result = await guidesCollection.insertOne(newGuides);
            res.send(result);
        })

        app.get('/booking', async (req, res) => {
            console.log(req.query.email);
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })
        app.post('/booking', async (req, res) => {
            const formData = req.body;
            console.log(formData);
            const result = await bookingCollection.insertOne(formData);
            res.send(result);
        });
        // ?for tourGuide

        app.get('/tBooking', async (req, res) => {
            // Assuming you have a MongoDB client instance and a database connection
        
            // Get the value of the tourGuide from the query parameters
            const tourGuideParam = req.query.tourGuide;
        
            // Define a filter based on the tourGuide parameter
            const filter = tourGuideParam ? { tourGuide: tourGuideParam } : {};
        
            // Use the filter parameter in the find method
            const result = await tBookingCollection.find(filter).toArray();
        
            res.send(result);
        });
        
        app.post('/tBooking', async (req, res) => {
            const formData = req.body;
            console.log(formData);
            const result = await tBookingCollection.insertOne(formData);
            res.send(result);
        });

        app.delete('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/wish', async (req, res) => {
            const cursor = wishCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })
        app.delete('/wish/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await wishCollection.deleteOne(query);
            res.send(result);
        })
        app.post('/wish', async (req, res) => {
            const { tourType, tripTitle } = req.body;
            console.log('Tour Type:', tourType);
            console.log('Trip Title:', tripTitle);
            const result = await wishCollection.insertOne({ wishlist: { tourType, tripTitle } }); res.send(result);
        })


        // payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            console.log(amount, 'amount inside the intent')

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        });


        // app.get('/payments/:email',  async (req, res) => {
        //     const query = { email: req.params.email }
        //     if (req.params.email !== req.decoded.email) {
        //       return res.status(403).send({ message: 'forbidden access' });
        //     }
        //     const result = await paymentCollection.find(query).toArray();
        //     res.send(result);
        //   })

        app.get('/payments', async (req, res) => {
            const result = await paymentCollection.find().toArray();
            res.send(result);
        })


        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const paymentResult = await paymentCollection.insertOne(payment);

            //  carefully delete each item from the cart
            console.log('payment info', payment);
            const query = {
                _id: {
                    $in: payment.bookingsIds.map(id => new ObjectId(id))
                }
            };

            const deleteResult = await bookingCollection.deleteMany(query);

            res.send({ paymentResult ,deleteResult});
        })











        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);







app.get('/', (req, res) => {
    res.send('server is starting')
})

app.listen(port, () => {
    console.log(`server is ok on here ${port}`);
})