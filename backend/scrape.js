import puppeteer from 'puppeteer';
import fs from 'fs';

const scrape = async (page) => {
  // Gather product title
  const title = await page.$$eval("div.a-section.a-spacing-base h2 span.a-color-base", (nodes) =>
    nodes.map((n) => n.innerText)
  );

  // Gather price
  const price = await page.$$eval(
    "div.a-section.a-spacing-base span.a-price[data-a-color='base'] span.a-offscreen",
    (nodes) => nodes.map((n) => n.innerText)
  );

  // Gather picture
  const picture = await page.$$eval(
    'div.a-section.a-spacing-base img.s-image[srcset]',
    (nodes) => nodes.map((n) => n.src)
  );

  // Put data together
  const amazonSearchArray = title.map((_, index) => {
    if (title[index] && price[index] && picture[index]) {
      return {
        title: title[index],
        price: price[index],
        picture: picture[index],
      };
    }
    else return null;  // Return null for items that do not contain all three
  }).filter(item => item !== null);  // Filter out the null entries

  return amazonSearchArray;
};

export const scrapeSearch = async (item) => {
  const browser = await puppeteer.launch({ headless: true });

  const page = await browser.newPage();

  await page.goto("https://www.amazon.com");

  try {
    await page.type("#twotabsearchtextbox", item);
    await page.click("#nav-search-submit-button");
  } catch (e) {
    // Fallback case, cause apparently Amazon has 2 sites...?
    await page.type('input[type="text"]', item);
    await page.click('input[type="submit"]');
  }

  await page.waitForSelector(".s-pagination-next");

  const ret = await scrape(page);

  // Save scraped data to JSON file
  fs.writeFile('output.json', JSON.stringify(ret, null, 2), err => {
    if (err) {
      console.error('Error writing file', err);
    } else {
      console.log('Successfully wrote data to file');
    }
  });

  await browser.close();

  return ret;
};
