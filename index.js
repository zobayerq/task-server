const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 7000;

app.use(cors({
  origin: [

    'http://localhost:5173',
    'http://localhost:5174',
    'https://task-b1ed3.web.app/',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: 'Unauthorized access' });
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.error(err);
      return res.status(401).send({ message: 'Unauthorized access' });
    }
    req.user = decoded;
    next();
  });
};






const uri = `mongodb+srv://${process.env.db_usr}:${process.env.db_pass}@cluster0.phr0gtm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    const database = client.db('taskir');
    const usersCollection = database.collection('users');
    const tasksCollection = database.collection('tasks');
  
  

    const verifyAdmin = async (req, res, next) => {
      console.log('hello')
      const user = req.user
      const query = { email: user?.email }
      const result = await usersCollection.findOne(query)
      console.log(result?.role)
      if (!result || result?.role !== 'Admin')
        return res.status(401).send({ message: 'unauthorized access!!' })

      next()
    }
 
    app.post('/jwt', async (req, res) => {
      const { email } = req.body;
      const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      });
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      }).send({ success: true });
    });

    app.get('/logout', (req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        maxAge: 0,
      }).send({ success: true });
    });









       //--------- task relted api-----------//
       
         // Get all tasks
    app.get('/tasks', async (req, res) => {
      const tasks = await tasksCollection.find({}).toArray();
      res.json(tasks);
    });

    // Get a single task by ID
    app.get('/tasks/:id', async (req, res) => {
      const { id } = req.params;
  
      const task = await tasksCollection.findOne({ _id: new ObjectId(id) });
     
      if (!task) return res.status(404).json({ message: 'Task not found' });
      res.json(task);
    });

    // Add a new task
    app.post('/tasks', async (req, res) => {
      const newTask = req.body;
      console.log(newTask);
      const result = await tasksCollection.insertOne(newTask);
      res.status(200).send(result)
    });
    






    // Mark a task as completed by ID
app.put('/tasks/toggle/:id', async (req, res) => {
  const { id } = req.params;
 
  const { completed } = req.body;
  const result = await tasksCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { completed } }
  );
  if (result.modifiedCount === 0) {
    return res.status(404).json({ message: 'Task not found' });
  }
  res.json({ message: 'Task marked as completed successfully' });
});


    // Delete a task by ID
    app.delete('/tasks/delete/:id', async (req, res) => {
      const { id } = req.params;
      console.log(id);
      const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Task not found' });
      }
      res.json({ message: 'Task deleted successfully' });
    });



    // Update a task by ID
app.put('/tasks/update/:id', async (req, res) => {
  const { id } = req.params;
  console.log(id);
  const { title, description, completed } = req.body;

  try {
    const updatedTask = await tasksCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { title, description, completed } },
      // Return the updated document
    );
    res.json(updatedTask.value);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});





    






    



    //---------------user------------//


    app.put('/user', async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const isExist = await usersCollection.findOne(query);
      if (isExist) {
        return;
      }

      const options = { upsert: true };
      const updateDoc = { $set: { ...user, timestamp: Date.now() } };
      const result = await usersCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    app.get('/user/:email', async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    });

    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

   















    


        /////// ---------------admin  api------------- //////

  




        app.delete('/user/:id',verifyToken, async (req, res) => {
          const { id } = req.params;
          
          try {
            const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
          } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).send({ message: 'Server Error' });
          }
        });





        //---chine  role
        app.put('/user/toggle-role/:id', verifyToken,  async (req, res) => {
          const { id } = req.params;
          const { role } = req.body;
          
          try {
            const result = await usersCollection.updateOne(
              { _id: new ObjectId(id) },
              { $set: { role: role } }
            );
            res.send(result);
          } catch (error) {
            console.error('Error toggling user role:', error);
            res.status(500).send({ message: 'Server Error' });
          }
        });


        ////--- user roool get 
        app.get('/user/rool/:email',  async (req, res) => {
          const { email } = req.params;
          try {
            const user = await usersCollection.findOne({ email });
            if (!user) {
              return res.status(404).send({ message: 'User not found' });
            }
            res.send({ role: user.role });
          } catch (error) {
            console.error('Error fetching user role:', error);
            res.status(500).send({ message: 'Server Error' });
          }
        });












  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send("Neuron server is running");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
