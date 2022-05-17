const express = require('express');
require('dotenv').config();
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wutyb.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run = async () => {
    try {
        await client.connect();
        const serviceCollection = client.db('doctors-portal').collection('services');
        const bookingCollection = client.db('doctors-portal').collection('bookings');

        app.get('/services', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services)
        });

        /**
         * API Naming Convension
         * app.get('/booking') //get all bookings in this collection or get more than one or by filter query.
         * app.get('/booking/:id') //get a specific booking
         * app.post('/booking') //add a new booking
         * app.patch('/booking/:id') //update specific one booking info
         * app.delete('/booking/:id') //Delete specific one booking 
        */
        app.post('/booking', async (req, res) => {
            const bookingInfoDoc = req.body;
            const query = {
                treatmentName: bookingInfoDoc.treatmentName,
                patientEmail: bookingInfoDoc.patientEmail,
                date: bookingInfoDoc.date,
            };
            const exist = await bookingCollection.findOne(query);
            if (exist) {
                return res.send({ success: false, bookingInfoDoc: exist })
            }
            const result = await bookingCollection.insertOne(bookingInfoDoc);
            return res.send({ success: true, result });
        });

    }
    finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Dr Faust Server is Running')
});

app.listen(port, () => {
    console.log('Dr Faust is listening from port', port);
});