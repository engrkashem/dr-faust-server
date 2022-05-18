const express = require('express');
require('dotenv').config();
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');

// to generate secret token: require('crypto').randomBytes(64).toString('hex')
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
        const userCollection = client.db('doctors-portal').collection('users');

        app.get('/services', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services)
        });

        // to add or update user info to database
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const option = { upsert: true }
            const updatedDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updatedDoc, option);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ result, token });
        });

        //this is not the properway to query
        //after learning mongodb, use aggregate, lookup, match, group.
        app.get('/available', async (req, res) => {
            const date = req.query.date;

            //Step-1: Get all services
            const services = await serviceCollection.find().toArray();

            //step-2: Get Bookings of that day
            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray();

            //step-3: for each service.
            services.forEach(service => {
                // find booking for that service. o/p [{},{},..]
                const bookedService = bookings.filter(b => b.treatmentName === service.name);
                //find the booked time slots for that service. o/p ['','',...]
                const bookedSlots = bookedService.map(s => s.timeSlot);
                //eleminate booked time slots from total time slots for that service. so that get available time slots to alot appointment time slot.
                const availebleSlots = service.slots.filter(s => !bookedSlots.includes(s));
                //set the available time slots to that service slots.
                service.slots = availebleSlots;
            })

            res.send(services);
        });

        /**
         * API Naming Convension
         * app.get('/booking') //get all bookings in this collection or get more than one or by filter query.
         * app.get('/booking/:id') //get a specific booking
         * app.post('/booking') //add a new booking
         * app.patch('/booking/:id') //update specific one booking info.
         * app.put('/booking/:id') // update a specific one if exist, if not then add that to database. upsert=> update (if exist) or insert (if new info).
         * app.delete('/booking/:id') //Delete specific one booking 
        */

        app.get('/booking', async (req, res) => {
            const patient = req.query.patient;
            const query = { patientEmail: patient };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        });

        app.post('/booking', async (req, res) => {
            const bookingInfoDoc = req.body;
            //query to cancel request of duplicate appointment
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