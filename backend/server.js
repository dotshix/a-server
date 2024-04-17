import express from 'express';
import dotenv from 'dotenv';
import { Webhook } from 'svix';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import User from './userModel.js'; // Ensure your userModel.js is updated accordingly
import cors from 'cors';
import { scrapeSearch } from './scrape.js'; // Import the scraper function

dotenv.config();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to DB');
  })
  .catch((err) => console.log(err.message));

const app = express();
app.use(cors());

// Middleware to parse incoming request body as raw for webhook verification
//app.use(bodyParser.raw({ type: 'application/json' }));
app.use(express.json());

// POST route for handling webhook events
app.post('/api/webhooks', async function (req, res) {
  try {
    const payloadString = req.body.toString();
    const svixHeaders = req.headers;

    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET_KEY);
    const evt = wh.verify(payloadString, svixHeaders);

    const { id } = evt.data; // Clerk's user ID
    const eventType = evt.type;
    const clerkUsername = evt.data.username; // Assuming username is part of the event data structure

    switch (eventType) {
      case 'user.created':
        // Create or update a user, setting the username
        const user = await User.findOneAndUpdate(
          { clerkUserId: id },
            {
              $set: { username: clerkUsername }, // Set username
              $setOnInsert: {
                gamesPlayed: 0,       // Set gamesPlayed to 0 only on insert
                attemptsCorrect: 0,   // Set attemptsCorrect to 0 only on insert
                attemptsWrong: 0      // Set attemptsWrong to 0 only on insert
              }
            },
          { new: true, upsert: true } // Create the document if it doesn't exist, return new document
        );
        console.log(`User ${id} created or updated with username: ${clerkUsername} and incremented counter.`);
        break;

      case 'user.deleted':
        await User.findOneAndDelete({ clerkUserId: id });
        console.log(`User ${id} deleted`);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// GET route to fetch user data including the counter
app.get('/api/user/:clerkUserId', async (req, res) => {
  try {
    const { clerkUserId } = req.params;
    const user = await User.findOne({ clerkUserId }, 'username gamesPlayed attemptsCorrect attemptsWrong'); // Fetch these fields
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    res.status(200).json({
      success: true,
      data: {
        username: user.username,
        gamesPlayed: user.gamesPlayed,
        attemptsCorrect: user.attemptsCorrect,
        attemptsWrong: user.attemptsWrong
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// POST route to increment user's counter
app.post('/api/updateGameStats/:clerkUserId', async (req, res) => {
  try {
    const { clerkUserId } = req.params;
    const { gamesPlayedInc, attemptsCorrectInc, attemptsWrongInc } = req.body; // These values are sent in the request body

    console.log(gamesPlayedInc, attemptsCorrectInc, attemptsWrongInc);  // Log the destructured variables
  console.log('Parsed body:', req.body);
    const updatedUser = await User.findOneAndUpdate(
      { clerkUserId },
      {
        $inc: {
          gamesPlayed: gamesPlayedInc || 0,       // Increment gamesPlayed by received value or 0
          attemptsCorrect: attemptsCorrectInc || 0, // Increment attemptsCorrect by received value or 0
          attemptsWrong: attemptsWrongInc || 0      // Increment attemptsWrong by received value or 0
        }
      },
      { new: true } // Return the updated document
    );
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    res.status(200).json({
      success: true,
      data: {
        username: updatedUser.username,
        gamesPlayed: updatedUser.gamesPlayed,
        attemptsCorrect: updatedUser.attemptsCorrect,
        attemptsWrong: updatedUser.attemptsWrong
      },
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// Endpoint to scrape data and return a random item
app.get('/api/scrape/:searchItem', async (req, res) => {
  const { searchItem } = req.params;
  try {
    const items = await scrapeSearch(searchItem);
    if (items.length === 0) {
      res.status(404).json({ success: false, message: "No items found" });
    } else {
      const randomItem = items[Math.floor(Math.random() * items.length)];
      res.status(200).json({ success: true, data: randomItem });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// GET route for scraping product information and returning a random item
app.get('/api/scrape', async (req, res) => {
  try {
    const { item } = req.query; // Capture the search item from the query parameter
    if (!item) {
      return res.status(400).json({
        success: false,
        message: 'No search item specified'
      });
    }

    const scrapedData = await scrapeSearch(item);
    const products = JSON.parse(scrapedData); // Parse the stringified JSON data

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No products found'
      });
    }

    // Select a random product from the array
    const randomProduct = products[Math.floor(Math.random() * products.length)];

    res.status(200).json({
      success: true,
      data: randomProduct
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

const port = process.env.PORT || 7000;

app.listen(port, () => {
  console.log(`Listening on port ${port}`);

});
