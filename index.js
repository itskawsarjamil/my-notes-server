const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
require('dotenv').config()
var jwt = require('jsonwebtoken');

const app = express()
const port = 5001

app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.hbrvwvk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {

        await client.connect();
        console.log('db connected');
        const stridDB = client.db("strideDB");
        const userCollection = stridDB.collection("userCollection");
        const notesCollection = stridDB.collection("notesCollection");
        // create a document to be inserted




        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
            res.send({ token })
        })

        app.get('/notes', async (req, res) => {
            const result = await notesCollection.find({ isDeleted: false }).toArray();
            // console.log('result of /notes');
            res.send(result);
        })
        app.post('/addnote', async (req, res) => {
            const data = req.body;
            const result = await notesCollection.insertOne(data);
            const finaldata = await notesCollection.find({ isDeleted: false }).sort({ createdAt: -1 }).toArray();
            res.send(finaldata)
        })
        app.get("/note/:id", async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const result = await userCollection.findOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        app.patch("/note/:id", async (req, res) => {
            const id = req.params.id;
            const userData2 = req.body;
            let userData = userData2;
            delete userData._id;
            // console.log('clg from /note/:id');
            // console.log(userData);
            const result = await notesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: userData },
                { upsert: true }
            );
            res.send(result);
        });

        app.delete("/note/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const find = { _id: new ObjectId(id) };
                const result = await notesCollection.deleteOne(find);
                res.send(result);
            }
            catch (e) {
                console.log(e);
                res.send({
                    success: false,
                    error: e.message,
                })
            }
        })

        app.get('/filtering', async (req, res) => {
            const filterValue = req.query.filter;
            // console.log(filterValue);
            let result;
            if (filterValue === 'all') {

                result = await notesCollection.find().toArray();
            }
            else {

                result = await notesCollection.find({ category: filterValue }).toArray();
            }
            // const result = await notesCollection.find({ category: filterValue }).sort({ createdAt: -1 }).toArray();
            // console.log(result);
            return res.send(result);
        })






        app.post("/user", async (req, res) => {
            const user = req.body;

            const token = createToken(user);
            const isUserExist = await userCollection.findOne({ email: user?.email });
            if (isUserExist?._id) {
                return res.send({
                    statu: "success",
                    message: "Login success",
                    token,
                });
            }
            await userCollection.insertOne(user);
            return res.send({ token });
        });


    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})