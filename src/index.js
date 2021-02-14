const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const session = require("express-session");

const session_secret = "newton";

const app = express();
app.use(express.json()); 
app.use(cors({
    credentials: true,
    origin: "http://localhost:3000"
}));
app.use(
  session({
    secret: session_secret,
    cookie: { maxAge: 1*60*60*1000 }
  })
); 


const db = mongoose.createConnection("mongodb://localhost:27017/RentApp", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  userName: String,
  password: String,
});

const ItemSchema = new mongoose.Schema({
  Name: String,
  price: Number,
  date: Date,
  cost: Number,
  userId: mongoose.Schema.Types.ObjectId,
});

const userModel = db.model("user", userSchema);
const ItemModel = db.model("Item", ItemSchema);


const isNullOrUndefined = (val) => val === null || val === undefined;
const SALT = 5;

app.post("/signup", async (req, res) => {
  const { userName, password } = req.body;
  const existingUser = await userModel.findOne({ userName });
  if (isNullOrUndefined(existingUser)) {
    
    const hashedPwd = bcrypt.hashSync(password, SALT);
    const newUser = new userModel({ userName, password: hashedPwd });

    await newUser.save();
    req.session.userId = newUser._id;
    res.status(201).send({ success: "Signed up" });
  } else {
    res.status(400).send({
      err: `UserName ${userName} already exists. Please choose another.`,
    });
  }
});

app.post("/login", async (req, res) => {
  const { userName, password } = req.body;
  const existingUser = await userModel.findOne({
    userName,
  });

  if (isNullOrUndefined(existingUser)) {
    res.status(401).send({ err: "UserName does not exist." });
  } else {
    const hashedPwd = existingUser.password;
    if (bcrypt.compareSync(password, hashedPwd)) {
      req.session.userId = existingUser._id;
      console.log('Session saved with', req.session);
      res.status(200).send({ success: "Logged in" });
    } else {
      res.status(401).send({ err: "Password is incorrect." });
    }
  }
});

const AuthMiddleware = async (req, res, next) => {
    console.log('Session', req.session);
  
  if (isNullOrUndefined(req.session) || isNullOrUndefined(req.session.userId) ) {
    res.status(401).send({ err: "Not logged in" });
  } else {
    next();
  }
};

app.get("/item", AuthMiddleware, async (req, res) => {
  const allitems = await ItemModel.find({ userId: req.session.userId });
  res.send(allitems);
});

app.post("/item", AuthMiddleware, async (req, res) => {
  const item = req.body;
  item.Name=req.body.Name;
  item.price = req.body.price;
  item.date = req.body.date;
  item.cost = req.body.cost;
  item.userId= req.session.userId;
  const newItem = new ItemModel(item);
  await newItem.save();
  res.status(201).send(newItem);
});



app.delete("/item/:itemid", AuthMiddleware, async (req, res) => {
  const itemid = req.params.itemid;

  try {
    await itemModel.deleteOne({ _id: itemid, userId: req.session.userId });
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(404);
  }
});

app.get("/logout", (req, res)=> {
    if(!isNullOrUndefined(req.session)) {
        
        req.session.destroy(() => {
            res.sendStatus(200);
        });

    } else {
        res.sendStatus(200);
    }
});

app.get('/userinfo', AuthMiddleware, async (req, res) => {
    const user = await userModel.findById(req.session.userId);
    res.send({ userName : user.userName });
});

app.listen(9999);