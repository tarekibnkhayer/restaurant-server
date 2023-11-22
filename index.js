const express = require('express');
const cors = require('cors');
const stripe = require("stripe")('sk_test_51OExQAKXZ0BKV5mDtOnJmMnNCsi4jCuwPBDpmgy8DEF8t54m97jayrppTgrbffmef7Ek4ls9kAtIQOlmcvXYqXnG00uvHiipKu');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 2626;
const { ObjectId } = require('mongodb');

// middleware:
app.use(express.static("public"));
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));

 



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
    const cartCollection = client.db("restaurantDB").collection("carts");
    const userCollection = client.db("restaurantDB").collection("users");
    const paymentCollection = client.db("restaurantDB").collection("payments");
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // auth related api:
    app.post('/jwt', async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
      res.send({token});
    });

    // middleware:
 const verifyToken = (req, res, next) => {
  if(!req.headers.authorization){
    return res.status(401).send({message: 'forbidden'});
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({message: 'forbidden'});
    }
    req.decoded = decoded;
    next()
  })
};
// use verifyAdmin after  verifyToken
const verifyAdmin = async(req, res, next) => {
  const email = req.decoded.email;
  const query = {email: email};
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === 'admin';
  if(!isAdmin){
    return res.status(403).send({message: 'forbidden'});
  }
  next();
}

    app.get("/users/admin/:email", verifyToken,  async(req, res) => {
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'Unauthorized access'});
      };
      const query = {email : email};
      const user = await userCollection.findOne(query);
      let admin = false;
      if(user){
        if(user?.role === 'admin'){
          admin = true;
        };
      };
      res.send({admin});
    })

    // 
    app.get("/menu", async(req, res) => {
       const menuIds = req.query.menuIds;
      if(menuIds){
        // const menuIdsArray =  Array.isArray(menuIds) ? menuIds : [menuIds];
        //  ids = {_id: {$in: menuIdsArray}};
        // const result = await menuCollection.find(ids).toArray();
        // console.log(result);
        // return res.send(result);
        const id = JSON.parse(decodeURIComponent(menuIds));
        // console.log(id);
        let ids = {};
        if(id){
          ids = {_id: {$in: id}}
          const result = await menuCollection.find(ids).toArray();
          return res.send(result);
        }
      }
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    app.get('/menu/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await menuCollection.findOne(query);
      res.send(result);
    })

    app.post('/menu',verifyToken, verifyAdmin, async(req, res) => {
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result);
    })
    app.get("/reviews", async(req, res) => {
        const result = await reviewCollection.find().toArray();
        res.send(result);
    });

    app.get('/carts', async(req, res) => {
      const email = req.query.email;
      const query = {email: email};
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/users",verifyToken, verifyAdmin,  async(req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.post("/carts",verifyToken, async(req, res) => {
      const cart = req.body;
      const result = await cartCollection.insertOne(cart);
      res.send(result);
    });
    app.post("/users", async(req, res) => {
      const user = req.body;
      const query = {email: user.email}
      const isExist = await userCollection.findOne(query);
      if(isExist){
        return res.send({message: "User Already Exist"});
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })
    app.delete("/carts/:id",verifyToken, async(req, res) => {
      const id = req.params.id;
      const query = {menuId: id};
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/users/:id",verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.delete('/menu/:id', verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id)};
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    })
    app.patch("/users/admin/:id", verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      };
      const result = await userCollection.updateOne(filter, updateDoc)
      res.send(result);
    });

    app.patch('/menu/:id', async(req, res) => {
      const id = req.params.id;
      const UpdatedItem = req.body;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          name: UpdatedItem.name,
          recipe: UpdatedItem.recipe,
          image: UpdatedItem.image,
          category: UpdatedItem.category,
          price: UpdatedItem.price
        }
      };
      const result = await menuCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.post('/create-payment-intent', async(req, res) => {
      const {price} = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card'],
      });
      res.send({clientSecret: paymentIntent.client_secret});
    });

    app.post('/payments', async(req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      // delete the cart items from cartCollection for which already paid:
      const query = {_id: {
        $in: payment.cartIds.map(id => new ObjectId(id))
      }}
      const deleteResult = await cartCollection.deleteMany(query);
      res.send({paymentResult, deleteResult});
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
