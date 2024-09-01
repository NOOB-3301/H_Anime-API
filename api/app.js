const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/anime/:year', async (req, res) => {
  try {
    const year = req.params.year
    const url = `https://animeidhentai.com/year/${year}/`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Select the articles within the div with the class 'anime-list'
    const animeList = [];
    $('.anime-list > article.anime.poster.por').each((i, element) => {
      const title = $(element).find('.anime-hd .ttl').text();
      const imgSrc = $(element).find('img').attr('data-cfsrc') || $(element).find('img').attr('src');
      const link = $(element).find('a.lnk-blk').attr('href');

      animeList.push({
        title,
        imgSrc,
        link,
      });
    });

    // Send the extracted data as a JSON response
    res.json(animeList);

  } catch (err) {
    console.error(err);
    res.status(500).send('Error occurred while scraping the website.');
  }
});

app.get('/anime/search/:query', async (req, res) => {
    try {
        const query = req.params.query;
        const url = 'https://animeidhentai.com/?s=';
        const fullUrl = `${url}${encodeURIComponent(query)}`; // Encode the query parameter to handle special characters
        const resp = await axios.get(fullUrl);

        const $ = cheerio.load(resp.data);

        const lists = [];
        $('.anime-list > article.anime.poster.por').each((i, elem) => {
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

            lists.push({
                title,
                img,
                link,
                meta: metaInfo // Add the metaInfo object with year, lang, and quality
            });
            console.log(title);
        });

        res.json(lists);
    } catch (error) {
        console.error(error); // Log the error for debugging
        res.status(500).send('Error occurred while scraping the website.');
    }
});



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
