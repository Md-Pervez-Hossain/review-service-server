require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");

const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { query } = require("express");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.zr5yxev.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorize user" });
  }
  const token = authHeader.split(" ")[1];
  console.log(token);
  console.log(process.env.DB_ACCESSTOKEN);
  jwt.verify(token, process.env.DB_ACCESSTOKEN, function (err, decoded) {
    console.log("err", err);
    console.log("decoded", decoded);
    if (err) {
      return res.status(401).send({ message: "UnAuthorize user" });
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
  try {
    const foodServiceCollection = client
      .db("foodServiceReview")
      .collection("foodServiceData");
    console.log("database connected");

    const reviewsCollection = client
      .db("foodServiceReview")
      .collection("reviews");
    const feedBackCollection = client
      .db("foodServiceReview")
      .collection("feedback");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.DB_ACCESSTOKEN, {
        expiresIn: "10h",
      });
      res.send({ token });
    });
    app.post("/feedback", async (req, res) => {
      const feedback = req.body;
      const result = await feedBackCollection.insertOne(feedback);
      res.send(result);
    });
    app.get("/feedback", async (req, res) => {
      const query = {};
      const cursor = feedBackCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      let query = {};
      const options = {
        sort: { time: -1 },
      };
      if (req.query.foodService) {
        query = {
          foodService: req.query.foodService,
        };
      }
      const cursor = reviewsCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/reviewss", verifyToken, async (req, res) => {
      const decoded = req.decoded;
      console.log("inside decoded", decoded);
      console.log(decoded.email);
      if (decoded.email !== req.query.email) {
        res.status(403).send({ message: "Forbiden" });
      }
      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }
      const cursor = reviewsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/reviewss/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await reviewsCollection.findOne(query);
      res.send(result);
    });
    app.put("/reviewss/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const myReview = req.body;
      const updateMyReview = {
        $set: {
          ratings: myReview.ratings,
          review: myReview.review,
          time: myReview.time,
        },
      };
      const result = await reviewsCollection.updateOne(
        filter,
        updateMyReview,
        options
      );
      res.send(result);
    });

    app.delete("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      console.log("trying to delete", id);
      const query = { _id: ObjectId(id) };
      const result = await reviewsCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/addservices/:id", async (req, res) => {
      const id = req.params.id;
      console.log("trying to delete", id);
      const query = { _id: ObjectId(id) };
      const result = await foodServiceCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/addservices", async (req, res) => {
      const query = {};
      const cursor = foodServiceCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/addservice/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await foodServiceCollection.findOne(query);
      res.send(result);
    });

    app.get("/addservice", async (req, res) => {
      const query = {};
      const cursor = foodServiceCollection.find(query);
      const result = await cursor.limit(3).toArray();
      res.send(result);
    });
    app.post("/addservice", async (req, res) => {
      const service = req.body;
      const result = await foodServiceCollection.insertOne(service);
      res.send(result);
    });
  } finally {
  }
}
run().catch((error) => console.error(error));

app.get("/", (req, res) => {
  res.send("server Running");
});

app.listen(port, () => {
  console.log("server running");
});
