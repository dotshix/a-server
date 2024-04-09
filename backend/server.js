import express from 'express';
import dotenv from 'dotenv';
import { Webhook } from 'svix';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import User from './userModel.js'; // Ensure your userModel.js is updated accordingly
import cors from 'cors';
import puppeteer from 'puppeteer';

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
app.use(bodyParser.raw({ type: 'application/json' }));

// POST route for handling webhook events
app.post('/api/webhooks', async function (req, res) {
  try {
    const payloadString = req.body.toString();
    const svixHeaders = req.headers;

    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET_KEY);
    const evt = wh.verify(payloadString, svixHeaders);

    const { id } = evt.data;
    const eventType = evt.type;

    switch (eventType) {
      case 'user.created':
        // Assuming you want to create or update a user with an incremented counter
        const user = await User.findOneAndUpdate(
          { clerkUserId: id },
          { $inc: { counter: 1 } }, // Increment counter
          { new: true, upsert: true } // Create the document if it doesn't exist, return new document
        );
        console.log(`User ${id} created or updated with incremented counter.`);
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
    // Implement your authentication check here.
    // For example, verify the Clerk session or JWT.

    const { clerkUserId } = req.params;
    const user = await User.findOne({ clerkUserId }, 'counter'); // Fetch only the 'counter' field
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    res.status(200).json({
      success: true,
      data: {
        counter: user.counter, // Return only the counter to the client
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
app.post('/api/updateCount/:clerkUserId', async (req, res) => {
  try {
    const { clerkUserId } = req.params;
    const updatedUser = await User.findOneAndUpdate(
      { clerkUserId },
      { $inc: { counter: 1 } }, // Increment counter
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
        counter: updatedUser.counter,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// Route to scrape bestsellers from Amazon
app.get('/api/scrapeBestSellers', async (req, res) => {
  try {
    const itemLinks = await scrapeBestSellers();
    res.json({
      success: true,
      data: itemLinks,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
// Route to scrape details from a specific Amazon item link
app.get('/api/scrapeItem', async (req, res) => {
  try {
    // Retrieve the item link from the query parameter
    const { link } = req.query;

    // Check if the link parameter is provided
    if (!link) {
      return res.status(400).json({
        success: false,
        message: 'Item link is required',
      });
    }

    // Call the scrapeItemLink function with the provided link
    const itemDetails = await scrapeItemLink(link);

    // Respond with the scraped item details
    res.status(200).json({
      success: true,
      data: itemDetails,
    });
  } catch (err) {
    // Handle any errors that occur during the process
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


// Implementation of the scrapeBestSellers function
async function scrapeBestSellers() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://www.amazon.com/gp/bestsellers/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.a-carousel-card .a-link-normal[href]', { visible: true });

  const itemLinks = await page.evaluate(() => {
    const links = [];
    const linkElements = document.querySelectorAll('.a-carousel-card .a-link-normal[href]');

    linkElements.forEach(linkElement => {
      const href = linkElement.href;
      if (href && !links.includes(href) && !href.includes('product-reviews'))
        links.push(href);
    });

    return links;
  });

  await browser.close();
  return itemLinks;
}

// Implementation of the scrapeItemLink function
async function scrapeItemLink(link) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(link, { waitUntil: 'domcontentloaded' });

  const itemDetails = await page.evaluate(() => {
    const title = document.querySelector('#productTitle')?.textContent?.trim() || 'Title Not Found';
    const price = document.querySelector('.aok-offscreen')?.textContent?.trim() || 'Price Not Found';
    const imgLink = document.querySelector('.a-dynamic-image')?.src || 'Image Not Found';

    return [title, price, imgLink];
  });

  await browser.close();
  return itemDetails;
}

const port = process.env.PORT || 7000;

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
