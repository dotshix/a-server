import axios from 'axios';
import { parse } from 'node-html-parser';

const fetchPage = async (url, item) => {
  const headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"};

  try {
    const response = await axios.get(`${url}/s?k=${encodeURIComponent(item)}`, { headers });
    console.log("HTTP Status Code:", response.status);  // Log the HTTP status code
    return response.data;
  } catch (error) {
    console.error("Error fetching page:", error);
    if (error.response) {
      console.error("HTTP Status Code:", error.response.status);  // Log the status code on error
    }
    return null;
  }
};

const scrape = (html) => {
  const root = parse(html);

  // Gather product titles
  const titleNodes = root.querySelectorAll("div.a-section.a-spacing-base h2 span.a-color-base.a-text-normal");
  const titles = titleNodes.map(node => node.innerText);

  // Gather prices
  const priceNodes = root.querySelectorAll('div.a-section.a-spacing-base span.a-price[data-a-color="base"] span.a-offscreen');
  const prices = priceNodes.map(node => node.innerText);

  // Gather pictures
  const pictureNodes = root.querySelectorAll("div.a-section.a-spacing-base img.s-image[srcset]");
  const pictures = pictureNodes.map(node => node.getAttribute("src"));

  // Put data together
  const products = titles.map((title, index) => {
    if (title && prices[index] && pictures[index])
      return { title, price: prices[index], picture: pictures[index] };

    return null;
  }).filter(item => item !== null);

  return products;
};

export const scrapeSearch = async (item) => {
  const html = await fetchPage("https://www.amazon.com", item);

  if (!html) {
    console.log("Failed to fetch HTML content.");
    return [];
  }
  return JSON.stringify(scrape(html), null, 2);
};

// Uncomment to run the function directly
// const main = async () => {
//   const result = await scrapeSearch("Pencil Case");
//   console.log(result);
// }

// main();
