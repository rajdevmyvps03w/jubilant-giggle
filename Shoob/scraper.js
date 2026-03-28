const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Function ro generate price
function generatePrice(tier) {
  const ranges = {
    1: [1000, 10000],
    2: [20000, 40000],
    3: [80000, 100000],
    4: [150000, 190000],
    5: [250000, 290000],
    6: [380000, 430000],
    S: [630000, 800000],
  };

  let key = tier; 
  if (typeof tier === "string") {
    const match = tier.match(/\d+/);
    if (match) key = parseInt(match[0], 10);
    if (/S/i.test(tier)) key = "S";
  }

  const [min, max] = ranges[key] || [1000, 5000]; // default safe range
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
// Function to generate 6-digit alphanumeric claim ID
function generateClaimCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789~#$%&^-=_+';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
async function scrapeShoobCards() {
	console.log('Starting Enhanced Shoob.gg card scraper...');

	// Launch browser with additional options to bypass some anti-scraping measures
	const browser = await puppeteer.launch({
		headless: true, // Use new headless mode for better compatibility
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--disable-dev-shm-usage',
			'--disable-accelerated-2d-canvas',
			'--no-first-run',
			'--no-zygote',
			'--disable-gpu',
			'--window-size=1920,1080',
			'--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		],
	});

	// Create a new page with increased timeouts
	const page = await browser.newPage();

	// Set viewport to standard desktop size
	await page.setViewport({ width: 1920, height: 1080 });

	// Set up request interception
	await page.setRequestInterception(true);
	page.on('request', request => {
		// Allow image requests since we need to see the card images
		if (
			request.resourceType() === 'font' ||
			request.resourceType() === 'media'
		) {
			request.abort();
		} else {
			request.continue();
		}
	});

	// Define options to handle dynamic content loading
	const navigationOptions = {
		waitUntil: 'networkidle2', // Wait until network is idle (better than domcontentloaded for SPAs)
		timeout: 60000, // 60 second timeout
	};

	try {
		console.log('Navigating to Shoob.gg cards page...');

		// Add retry mechanism for navigation
		let retries = 0;
		const maxRetries = 3;
		let navigationSuccessful = false;

		while (retries < maxRetries && !navigationSuccessful) {
			try {
				// Go directly to the cards page with updated navigation options
				await page.goto('https://shoob.gg/cards/', navigationOptions);
				navigationSuccessful = true;
			} catch (error) {
				retries++;
				console.log(`Navigation attempt ${retries} failed: ${error.message}`);

				if (retries === maxRetries) {
					throw error;
				}

				// Wait before retrying
				await new Promise(resolve => setTimeout(resolve, 3000));
			}
		}

		// Wait for some content to load to ensure page is ready
		await page.waitForSelector('body', { timeout: 10000 });

		// Add a small delay to let JavaScript execute
		await new Promise(resolve => setTimeout(resolve, 5000));

       // Take a screenshot for debugging
        //await page.screenshot({ path: 'debug-screenshot.png' }); 
        console.log('Captured debug screenshot');
		// Define the card selector based on the HTML structure
		const cardSelector = '.card-main';

		// Wait for card elements to appear
		await page
			.waitForSelector(cardSelector, { timeout: 15000 })
			.catch(() =>
				console.log('Warning: Card selector not found, continuing anyway')
			);

		// Get the total number of pages
		const totalText = await page.evaluate(() => {
			const totalElement = document.querySelector('[class*="total"]');
			return totalElement ? totalElement.textContent : '';
		});

		// Extract total count from text
		let totalCards = 0;
		const totalMatch = totalText.match(/TOTAL\s+(\d+)/i);
		if (totalMatch) {
			totalCards = parseInt(totalMatch[1], 10);
		}

		// Calculate pages (25 cards per page based on your screenshot)
		const cardsPerPage = 25;
		const totalPages = Math.ceil(totalCards / cardsPerPage) ||2268;
		console.log(
			`Found approximately ${totalCards} total cards across ${totalPages} pages`
		);

		// Limit pages for initial scraping (adjust as needed)
		const pagesToScrape = totalPages;
		console.log(`Will scrape ${pagesToScrape} pages for this run`);

		const allCards = [];

		// Loop through pages
		for (let pageNum = 1; pageNum <= pagesToScrape; pageNum++) {
			console.log(`Scraping page ${pageNum}/${pagesToScrape}...`);

			// Navigate to specific page using pagination number
			if (pageNum > 1) {
				try {
					await page.goto(
						`https://shoob.gg/cards/?page=${pageNum}`,
						navigationOptions
					);

					// Add a small delay to let JavaScript execute
					await new Promise(resolve => setTimeout(resolve, 5000));
				} catch (error) {
					console.error(
						`Error navigating to page ${pageNum}: ${error.message}`
					);
					continue; // Skip to next page if this one fails
				}
			}

			// Wait for cards to load
			await page
				.waitForSelector(cardSelector, { timeout: 15000 })
				.catch(() =>
					console.log('Warning: Card selector not found, continuing anyway')
				);

			// Extract card IDs and URLs from listing page
			const cardIds = await page.evaluate(() => {
				const cards = [];
				const cardElements = document.querySelectorAll('.card-main');

				cardElements.forEach(card => {
					try {
						// Get card link and ID
						const cardLink = card.querySelector('a');
						if (cardLink) {
							const href = cardLink.href;
							const idMatch = href.match(/\/cards\/info\/([^\/\?]+)/);
							if (idMatch && idMatch[1]) {
								const id = idMatch[1];

								// Extract title from image alt/title attribute
								let title = '';
								const imgElement = card.querySelector('img[title]');
								if (imgElement && imgElement.title) {
									title = imgElement.title;
								} else if (imgElement && imgElement.alt) {
									title = imgElement.alt;
								}

								cards.push({
									id: id,
									title: title,
									detailUrl: href,
								});
							}
						}
					} catch (err) {
						console.error('Error processing card element:', err);
					}
				});

				return cards;
			});

			console.log(`Found ${cardIds.length} card IDs on page ${pageNum}`);

			// Visit each card's detail page to get high-resolution image
			for (let i = 0; i < cardIds.length; i++) {
				const card = cardIds[i];
				console.log(`Processing card ${i + 1}/${cardIds.length}: ${card.id}`);

				try {
					// Navigate to the detail page with retry mechanism
					let detailRetries = 0;
					const maxDetailRetries = 2;
					let detailNavigationSuccessful = false;

					while (
						detailRetries < maxDetailRetries &&
						!detailNavigationSuccessful
					) {
						try {
							await page.goto(card.detailUrl, {
								waitUntil: 'domcontentloaded',
								timeout: 30000,
							});
							detailNavigationSuccessful = true;
						} catch (error) {
							detailRetries++;
							console.log(
								`Detail page navigation attempt ${detailRetries} failed: ${error.message}`
							);

							if (detailRetries === maxDetailRetries) {
								throw error;
							}

							// Wait before retrying
							await new Promise(resolve => setTimeout(resolve, 2000));
						}
					}

					console.log('Waiting for card content to load...');

					// Wait for loading spinner to disappear and content to appear
					try {
						// First wait for page to stabilize
						await new Promise(resolve => setTimeout(resolve, 5000));

						// Check if loading indicator is present
						const isLoading = await page.evaluate(() => {
							return document.body.innerText.includes('Loading this card');
						});

						if (isLoading) {
							console.log('Loading indicator detected, waiting longer...');
							// Wait longer for content to load if loading indicator is present
							await new Promise(resolve => setTimeout(resolve, 10000));
						}

						// Wait specifically for the card image to appear
						await page
							.waitForSelector('div.cardData img.img-fluid', {
								timeout: 20000,
								visible: true,
							})
							.catch(e =>
								console.log('Warning: Timed out waiting for card image')
							);
					} catch (error) {
						console.log(`Error waiting for content: ${error.message}`);
					}


					// Extract the high-resolution image URL and other details
const cardDetails = await page.evaluate(() => {
  const getText = (sel) => document.querySelector(sel)?.innerText.trim() || '';

  // Card image
  // Universal source picker (supports PNG + WEBM)
const mediaElement =
  document.querySelector('div.cardData video.img-fluid') ||
  document.querySelector('div.cardData img.img-fluid') ||
  document.querySelector('video.img-fluid') ||
  document.querySelector('img.img-fluid');

const highResImageUrl = mediaElement?.src || '';
const cardTitle = mediaElement?.title || mediaElement?.alt || '';

  // Get all breadcrumb items
const breadcrumbItems = Array.from(document.querySelectorAll('.breadcrumb-new li span[itemprop="name"]'))
  .map(el => el.innerText.trim());

// Map them explicitly
const tierText = breadcrumbItems[1] || null; // "Tier 4"
const series = breadcrumbItems[2] || null;   // "Series Name"
const titleFromBreadcrumb = breadcrumbItems[3] || null; // "Card Title"


// Parse tier properly
let tier = null;
if (tierText) {
  const matchNumber = tierText.match(/\d+/); // e.g., "4" from "Tier 4"
  if (matchNumber) {
    tier = parseInt(matchNumber[0], 10); // numeric tier
  } else {
    tier = tierText.replace(/Tier\s*/i, "").trim(); // for S, SS, etc.
  }
}


  // Creators
  const creators = Array.from(document.querySelectorAll('.padded20.user_purchased h1.nice'))
    .filter(h1 => h1.textContent.includes("Creators"))
    .map(h1 => h1.parentElement.querySelector('p')?.innerText.replace("Card Maker:", "").trim())
    .filter(Boolean);

  // Special attributes
  let specialAttributes = [];
  const headers = document.querySelectorAll('h1.nice');
  headers.forEach(h1 => {
    if (h1.textContent.includes("Special attributes")) {
      const container = h1.nextElementSibling;
      if (container) {
        specialAttributes = Array.from(container.querySelectorAll('.flex div'))
          .map(el => el.textContent.trim())
          .filter(Boolean);
      }
    }
  });

  // Want count
  let wantCount = 0;
  document.querySelectorAll('h1.nice').forEach(h1 => {
    if (h1.textContent.includes("People who want this card!")) {
      const match = h1.textContent.match(/\d+/);
      wantCount = match ? parseInt(match[0], 10) : 0;
    }
  });

  // ✅ Owners: Only usernames
const owners = Array.from(
  document.querySelectorAll(".infinitescroll-container > div.inline-block img")
).map(img => img.getAttribute("title")).filter(Boolean);

  return {
    highResImageUrl,
    cardTitle,
    tier,
    series,
    titleFromBreadcrumb,
    creators,
    specialAttributes,
    wantCount,
	owners
  };
});

// FIX: Handle Tier S / 6 cards with .webm instead of .png
          if (cardDetails.tier === 6 || cardDetails.tier === 'S') {
            if (cardDetails.highResImageUrl.endsWith('.png')) {
              const baseName = path.basename(cardDetails.highResImageUrl, '.png');
              const folder = cardDetails.tier === 6 ? '6' : 'S';
              cardDetails.highResImageUrl = `https://cdn.shoob.gg/images/cards/${folder}/${baseName}.webm`;
            }
          }



					// Add the high-res image URL to our card data
card.imageUrl = cardDetails.highResImageUrl;
card.title = card.title || cardDetails.cardTitle || cardDetails.titleFromBreadcrumb;
card.tier = cardDetails.tier;
card.series = cardDetails.series;
card.creators = cardDetails.creators;
card.owners = [...new Set(cardDetails.owners)];
card.creatorLinks = cardDetails.creatorLinks;
card.specialAttributes = cardDetails.specialAttributes;
card.wantCount = cardDetails.wantCount;
card.price = generatePrice(cardDetails.tier);
card.claim = generateClaimCode(6);

					// Debugging: Take a screenshot of the detail page
					//enshot({ path: `debug-card-${card.id}.png` });

					if (!card.imageUrl) {
						console.log(
							`No image URL found for card ${card.id}, saved debug screenshot`
						);

						// Try an alternate approach to get the image
						const htmlContent = await page.content();
						// Look for image URL patterns in the raw HTML
						const imageUrlMatches = htmlContent.match(
							/https:\/\/cdn\.shoob\.gg\/images\/cards\/[^"'\s]+/g
						);
						if (imageUrlMatches && imageUrlMatches.length > 0) {
							card.imageUrl = imageUrlMatches[0]; // Use the first match
							console.log(`Found image URL in raw HTML: ${card.imageUrl}`);
						}
					}

					allCards.push(card);

					// Brief delay between requests to avoid rate limiting
					await new Promise(resolve => setTimeout(resolve, 1000));
				} catch (error) {
					console.error(`Error scraping card ${card.id}:`, error.message);
					// Still add the card with partial data
					allCards.push(card);

					// Longer delay after an error to avoid being blocked
					await new Promise(resolve => setTimeout(resolve, 3000));
				}
			}

			// Save intermediate results after each page
			fs.writeFileSync(
				`shoob_cards_page_${pageNum}.json`,
				JSON.stringify(allCards, null, 2)
			);
			console.log(`Intermediate data saved for page ${pageNum}`);

			// Brief delay between pages
			await new Promise(resolve => setTimeout(resolve, 2000));
		}

		console.log(`Total cards collected: ${allCards.length}`);

		// Save to JSON file
		fs.writeFileSync(
			'shoob_cards_enhanced.json',
			JSON.stringify(allCards, null, 2)
		);
		console.log('Data saved to shoob_cards_enhanced.json');

		return allCards;
	} catch (error) {
		console.error('An error occurred during scraping:', error);
		throw error;
	} finally {
		await browser.close();
		console.log('Browser closed. Scraping complete.');
	}
}

/**
 * Alternative approach - using a proxy to avoid blocks
 */
async function scrapeShoobCardsWithProxy() {
	console.log('Starting Enhanced Shoob.gg card scraper with proxy...');

	// If you have a proxy service, uncomment and use this approach
	/*
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--proxy-server=http://your-proxy-address:port' // Replace with your proxy
    ]
  });
  
  const page = await browser.newPage();
  
  // If the proxy requires authentication
  await page.authenticate({
    username: 'proxy-username',
    password: 'proxy-password'
  });
  */

	// Rest of the function would be similar to scrapeShoobCards()
	// ...

	console.log(
		'Proxy scraping option is commented out. Uncomment and configure if needed.'
	);
}

/**
 * Main function to run the scraper
 */
async function main() {
	try {
		const cards = await scrapeShoobCards();
		console.log(`Successfully scraped ${cards.length} cards`);
		console.log('Example of first few cards:');
		console.log(JSON.stringify(cards.slice(0, 3), null, 2));
		return cards;
	} catch (error) {
		console.error('Error in main function:', error);
		// If main scraping fails, you could try with the proxy option
		console.log(
			'You might want to try the proxy version if regular scraping fails consistently'
		);
	}
}

// Run the scraper
if (require.main === module) {
	main().catch(console.error);
}

module.exports = {
	scrapeShoobCards,
	scrapeShoobCardsWithProxy,
};