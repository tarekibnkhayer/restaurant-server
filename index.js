const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 2626;
const { ObjectId } = require('mongodb');

// middleware:
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
        const id = JSON.parse(decodeURIComponent(menuIds));
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
    app.delete("/users/:id",verifyToken, async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

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
