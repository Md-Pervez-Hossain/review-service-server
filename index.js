const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//SSl Commerce

const SSLCommerzPayment = require("sslcommerz-lts");
const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWORD;
const is_live = false; //true for live, false for sandbox

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
    const AllFoodsOrderInfo = client
      .db("foodServiceReview")
      .collection("AllFoodsOrderInfo");
    const FoodsBlog = client.db("foodServiceReview").collection("FoodsBlog");

    //ssl commerce start

    //ssl commerce end

    app.post("/orders", async (req, res) => {
      const orderInfo = req.body;
      console.log(orderInfo);
      const transactionId = new ObjectId().toString();
      const data = {
        total_amount: orderInfo?.foodPrice,
        currency: "BDT",
        tran_id: transactionId, // use unique tran_id for each api call
        success_url: `http://localhost:5000/payment/success?transactionId=${transactionId}`,
        fail_url: "http://localhost:5000/payment/success",
        cancel_url: "http://localhost:5000/payment/success",
        ipn_url: "http://localhost:3030/ipn",
        shipping_method: "Courier",
        product_name: orderInfo?.FoodsName,
        product_category: "Electronic",
        product_profile: "general",
        cus_name: orderInfo?.cus_name,
        cus_email: orderInfo?.cus_email,
        cus_add1: orderInfo?.cus_add1,
        cus_add2: "Dhaka",
        cus_city: orderInfo?.cus_city,
        cus_state: orderInfo?.cus_state,
        cus_postcode: orderInfo?.cus_postcode,
        cus_country: orderInfo?.cus_country,
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: orderInfo?.ship_name,
        ship_add1: orderInfo?.ship_add1,
        ship_add2: "Dhaka",
        ship_city: orderInfo?.ship_city,
        ship_state: orderInfo?.ship_state,
        ship_postcode: orderInfo?.ship_postcode,
        ship_country: orderInfo?.ship_country,
      };
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse) => {
        // Redirect the user to payment gateway
        console.log(apiResponse);
        let GatewayPageURL = apiResponse.GatewayPageURL;
        AllFoodsOrderInfo.insertOne({
          ...orderInfo,
          transactionId,
          paid: false,
        });

        res.send({ url: GatewayPageURL });
      });
    });

    app.post("/payment/success", async (req, res) => {
      console.log("success");
      const { transactionId } = req.query;
      console.log(transactionId);
      const result = await AllFoodsOrderInfo.updateOne(
        { transactionId },
        { $set: { paid: true, paidAt: new Date() } }
      );
      if (result.modifiedCount > 0) {
        res.redirect(`http://localhost:3000/payment/success/${transactionId}`);
      }
    });

    app.get("/orders", async (req, res) => {
      const query = {};
      const result = await AllFoodsOrderInfo.find(query).toArray();
      res.send(result);
    });

    app.put("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const orders = req.body;
      const options = { upsert: true };
      const filter = { _id: new ObjectId(id) };
      const updateOrder = {
        $set: {
          status: true,
        },
      };
      const result = await AllFoodsOrderInfo.updateOne(
        filter,
        updateOrder,
        options
      );
      res.send(result);
    });

    app.get("/orders/:cus_email", async (req, res) => {
      const cus_email = req.params.cus_email;
      const query = { cus_email: cus_email };
      const result = await AllFoodsOrderInfo.find(query).toArray();
      res.send(result);
    });
    app.get("/payment/success/:transactionId", async (req, res) => {
      const transactionId = req.params.transactionId;
      const query = { transactionId: transactionId };
      const result = await AllFoodsOrderInfo.findOne(query);
      res.send(result);
    });

    // Foods blog start

    // foods blog post api
    app.post("/foodsBlog", async (req, res) => {
      const foodsBlog = req.body;
      console.log(foodsBlog);
      const cursor = await FoodsBlog.insertOne(foodsBlog);
      res.send(cursor);
    });
    app.get("/foodsBlog", async (req, res) => {
      const query = {};
      const result = await FoodsBlog.find(query).toArray();
      res.send(result);
    });
    app.get("/foodsBlog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await FoodsBlog.findOne(query);
      res.send(result);
    });

    // Foods blog end

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
    app.get("/singleFood/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const cursor = await foodServiceCollection.findOne(query);
      res.send(cursor);
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
