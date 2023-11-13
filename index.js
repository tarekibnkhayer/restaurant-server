const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 2626;

// middleware:
app.use(express.json());
app.use(cors());




const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.DB_URI;

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
    const menuCollection = client.db("restaurantDB").collection("menu");
    const reviewCollection = client.db("restaurantDB").collection("reviews");
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    app.get("/menu", async(req, res) => {
        const result = await menuCollection.find().toArray();
        res.send(result);
    });
    app.get("/reviews", async(req, res) => {
        const result = await reviewCollection.find().toArray();
        res.send(result);
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`Hello from port ${port}`);
})
app.get('/', (req, res) => {
    res.send(`Restaurant Server is Running`)
})
