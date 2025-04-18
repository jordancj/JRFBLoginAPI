import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();

const app = express();
const port = process.env.PORT || 8080;
const cosmosDbUri: string | undefined = process.env.COSMOS_DB_URI;
const secretKey = process.env.JWT_SECRET!;
const corsOptions: CorsOptions = {
  origin: [],
  methods: 'POST',
  credentials: true,
};

if (process.env.NODE_ENV === 'development') {
  corsOptions.origin = ['http://localhost:8080', 'http://127.0.0.1:8080']; // Allow localhost in development
} else if (process.env.NODE_ENV === 'production') {
  corsOptions.origin = ['https://ashy-ocean-0062f3f00.5.azurestaticapps.net']; // Allow only your production domain
}
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

if (!cosmosDbUri) {
  throw new Error('URI is not defined in the environment variables.');
}

const client = new MongoClient(cosmosDbUri);
client.connect().then(() => {
  const db = client.db('JRFBLogin');
  const usersCollection = db.collection('Usernames');
  const recordsCollection = db.collection('Records');

  app.post('/login', async (req: Request, res: Response) => {
    try {
      const { username } = req.body;

      function sanitizeUsername(username: string): string {
        const sanitized = username.trim().toLowerCase();
        if (sanitized.length < 3 || sanitized.length > 20) {
          throw new Error('Invalid username length. Must be between 3 and 20 characters.');
        }
        if (/^[a-z.]+$/.test(sanitized)) {
          return sanitized;
        }
        throw new Error('Invalid username. Only letters and full stops are allowed');
      }

      const sanitizedUsername = sanitizeUsername(username);
      const user = await usersCollection.findOne({ username: sanitizedUsername });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication failed' });
      }

      const token = jwt.sign(
        { username: user.sanitizedUsername },
        secretKey,
        { expiresIn: '1h' }
      );
      return res.status(200).json({ success: true, token });

    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ success: false, message: 'An error occurred' });
    }
  });

  app.post('/submit', async (req: Request, res: Response) => {
    const { timestamp, name, operational, activity } = req.body;

    try {
      const result = await recordsCollection.insertOne({
        timestamp,
        name,
        operational,
        activity
      });

      res.status(200).json({ message: 'Data submitted successfully', result });
    } catch (error) {
      console.error('Error submitting data', error);
      res.status(500).json({ message: 'Failed to submit data' });
    }
  });

  app.post('/api/names', async (req: Request, res: Response) => {
    const { query } = req.body;

    try {
      interface User {
        username: string;
      }

      const names = await usersCollection.find<User>(
        { username: { $regex: query, $options: 'i' } }, // Use regex for case-insensitive search
        { projection: { username: 1, _id: 0 } } // Only return the username field
      ).toArray();

      res.status(200).json(names);
    } catch (error) {
      console.error('Error fetching names', error);
      res.status(500).json({ message: 'Failed to fetch names' });
    }
  });

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}).catch((err) => {
  console.error('Failed to connect to database:', err);
});
