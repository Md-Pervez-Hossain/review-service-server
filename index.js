const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.zr5yxev.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run() {
  try {
    const foodServiceCollection = client
      .db("foodServiceReview")
      .collection("foodServiceData");
    console.log("database connected");

    app.get("/addservice", async (req, res) => {
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
