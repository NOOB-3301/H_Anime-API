const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Function to fetch iframe link from a given anime detail page
async function fetchIframeLink(link) {
    try {
        const resp = await axios.get(link);
        const $ = cheerio.load(resp.data);
        // Extract the src of the first iframe
        return $('iframe').first().attr('src') || ''; // Return an empty string if no iframe is found
    } catch (error) {
        console.error('Error fetching iframe link:', error);
        return ''; // Return an empty string in case of an error
    }
}

app.get('/apiv2/anime/:year', async (req, res) => {
  try {
    const year = req.params.year;
    const url = `https://animeidhentai.com/year/${year}/`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Select the articles within the div with the class 'anime-list'
    const animeList = [];
    const animeItems = $('.anime-list > article.anime.poster.por');

    // Create an array of promises for fetching iframe links
    const promises = animeItems.map(async (i, element) => {
      const title = $(element).find('.anime-hd .ttl').text().trim();
      const imgSrc = $(element).find('img').attr('data-cfsrc') || $(element).find('img').attr('src');
      const link = $(element).find('a.lnk-blk').attr('href');

      // Fetch the page with the iframe link
      const iframeLink = await fetchIframeLink(link);

      // Initialize meta information
      const metaInfo = {
        year: '',
        lang: '',
        quality: ''
      };

      // Extract and classify meta information
      $(element).find('.meta').each((i, meta) => {
        const metaText = $(meta).text().trim();
        const metaItems = metaText.split('•').map(item => item.trim()).filter(Boolean);

        metaItems.forEach(item => {
          if (item.match(/^\d{4}$/)) {
            metaInfo.year = item;
          } else if (item.match(/^\d+p$/)) {
            metaInfo.quality = item;
          } else if (item.toLowerCase() === 'english' || item.toLowerCase() === 'japanese') {
            metaInfo.lang = item;
          }
        });
      });

      return {
        title,
        imgSrc,
        link,
        meta: metaInfo,
        iframe_link: iframeLink // Add the iframe link to the response
      };
    }).get(); // Convert the Cheerio object to an array

    // Wait for all promises to resolve
    const lists = await Promise.all(promises);

    res.json(lists);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error occurred while scraping the website.');
  }
});

app.get('/apiv2/anime/search/:query', async (req, res) => {
  try {
      const query = req.params.query;
      const url = 'https://animeidhentai.com/?s=';
      const fullUrl = `${url}${encodeURIComponent(query)}`; // Encode the query parameter to handle special characters
      const resp = await axios.get(fullUrl);

      const $ = cheerio.load(resp.data);

      const animeItems = $('.anime-list > article.anime.poster.por');
      
      // Create an array of promises for fetching iframe links
      const promises = animeItems.map(async (i, elem) => {
          const title = $(elem).find('.anime-hd .ttl').text().trim(); // Extract and trim title
          const img = $(elem).find('img').attr('data-cfsrc') || $(elem).find('img').attr('src');
          const link = $(elem).find('a.lnk-blk').attr('href');
          
          // Initialize meta information
          const metaInfo = {
              year: '',
              lang: '',
              quality: ''
          };

          // Extract and classify meta information
          $(elem).find('.meta').each((i, meta) => {
              const metaText = $(meta).text().trim();
              const metaItems = metaText.split('•').map(item => item.trim()).filter(Boolean); // Split and trim each item

              metaItems.forEach(item => {
                  if (item.match(/^\d{4}$/)) { // Check if item is a year (e.g., 2024)
                      metaInfo.year = item;
                  } else if (item.match(/^\d+p$/)) { // Check if item is a quality (e.g., 1080p)
                      metaInfo.quality = item;
                  } else if (item.toLowerCase() === 'english' || item.toLowerCase() === 'japanese') { // Check for language
                      metaInfo.lang = item;
                  }
              });
          });

          // Fetch the page with the iframe link
          const llk_resp = await axios.get(link);
          const $2 = cheerio.load(llk_resp.data);
          // Extract the src of the first iframe
          const iframe_link = $2('iframe').first().attr('src');

          return {
              title,
              img,
              link,
              meta: metaInfo, // Add the metaInfo object with year, lang, and quality
              iframe_link
          };
      }).get(); // Convert the Cheerio object to an array

      // Wait for all promises to resolve
      const lists = await Promise.all(promises);

      res.json(lists);
  } catch (error) {
      console.error(error); // Log the error for debugging
      res.status(500).send('Error occurred while scraping the website.');
  }
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
