const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app=express();
const port=process.env.PORT || 5000;

// middleware
app.use(cors({
  origin: "https://user-email-password-auth-117c5.web.app",
  credentials: true
}));
app.use(express.json())
// mongodb
console.log("user",process.env.DB_USER)
console.log("pass",process.env.DB_PASS)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uok4zlq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });


async function run() {
  try {
    await client.connect();
    const db = client.db('storytelling');
    const usersCollection = db.collection("users");
    const storyCollection = db.collection("stories");
    const interactionsCollection = db.collection("interactionsCollection");


    app.use((req, res, next) => {
      req.db = db; 
      next();
    });

    // user related api
    app.post("/user",async(req,res)=>{
      const { profile, email, password } = req.body;
      const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(200).json({ message: "User already exists" });
    }
    const result = await usersCollection.insertOne({ profile, email, password });
      res.send(result)
  })
  
  app.get("/user",async(req,res)=>{
      const result=await usersCollection.find().toArray();
      res.send(result)
  })

// story related api
app.post("/api/stories/createStory",async(req,res)=>{
  const { title, segments ,email} = req.body;
  const newStory = {
    title, 
    segments,
    email,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = await storyCollection.insertOne(newStory);
    res.send(result)
  })

app.get("/api/stories/getStories",async(req,res)=>{
  console.log("Received request at /api/stories/getStories");
    const stories = await storyCollection.find({}).toArray();
    res.send(stories)
    })

app.get("/api/stories/getStoryById/:id",async(req,res)=>{
    const id=req.params.id;
    console.log(id)
    const query={_id:new ObjectId(id)}
    const story = await storyCollection.findOne(query);
    console.log("update",story)
    res.send(story)
})


app.patch("/api/stories/updateStory/:id", async (req, res) => {
  const id = req.params.id;
  const filter = {
    _id: new ObjectId(id)
  }
  const item = req.body;
  const updatedStory = {
     $set: { ...item, updatedAt: new Date() } 
  }
  console.log(updatedStory)
  const result = await storyCollection.updateOne(filter, updatedStory);
  console.log("result from update quantity",result)
  res.send(result)
})
app.delete("/api/stories/deleteStory/:id",async(req,res)=>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)}
  const result=await storyCollection.deleteOne(query)
  res.send(result)
})

app.get("/api/stories/userstories", async (req, res) => {
  const userEmail = req.query.email; 
  
  if (!userEmail) {
    return res.status(400).send({ error: "Email is required" });
  }
  
  const stories = await storyCollection.find({ email: userEmail }).toArray();
  res.send(stories);
});

app.post('/api/stories/interaction', async (req, res) => {
  const { storyId, userEmail, segmentId, choiceText, timeSpent } = req.body;
  const interaction = {
    storyId,
    userEmail,
    segmentId,
    choiceText,
    timeSpent,
    timestamp: new Date()
  };

 const result = await  interactionsCollection.insertOne(interaction);
res.send(result)
});
app.get('/api/stories/:storyId/insights', async (req, res) => {
  const { storyId } = req.params;

  const popularChoices = await  interactionsCollection.aggregate([
    { $match: { storyId: storyId } },
    { $group: { _id: "$choiceText", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
res.send(popularChoices);
});
app.get('/api/stories/:storyId/time-insights', async (req, res) => {
  const { storyId } = req.params;

  const timeInsights = await  interactionsCollection.aggregate([
    { $match: { storyId: storyId } },
    { $group: { _id: "$segmentId", avgTimeSpent: { $avg: "$timeSpent" } } },
    { $sort: { avgTimeSpent: -1 } }
  ]).toArray();

  res.send(timeInsights);
});

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/",async(req,res)=>{
    res.send("Story teller server is running")
})

app.listen(port,()=>{
    console.log(`Story teller is running on ${port}`)
})