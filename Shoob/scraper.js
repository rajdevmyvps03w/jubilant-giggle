const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const CONCURRENCY_LIMIT = 15; // Ek sath 10 cards scrape honge (Sabse zyada speed boost)

// Function to generate price (RETAINED)
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

  const [min, max] = ranges[key] || [1000, 5000];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to generate 6-digit alphanumeric claim ID (RETAINED)
function generateClaimCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789~#$%&^-=_+';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * NEW: Parallel Worker Function
 * Ye function har card ka detail page alag se fast process karega
 */
async function scrapeCardDetail(browser, card) {
    const detailPage = await browser.newPage();
    
    // Efficiency: Block CSS, Fonts, and Images to save bandwidth and CPU
    await detailPage.setRequestInterception(true);
    detailPage.on('request', (req) => {
        if (['font', 'stylesheet', 'media'].includes(req.resourceType())) {
            req.abort();
        } else {
            req.continue();
        }
    });

    try {
        // Fast navigation
        await detailPage.goto(card.detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Smart wait: Instead of setTimeout(5000), wait for actual data
        await detailPage.waitForSelector('.breadcrumb-new', { timeout: 10000 }).catch(() => {});

        const cardDetails = await detailPage.evaluate(() => {
            const mediaElement =
                document.querySelector('div.cardData video.img-fluid') ||
                document.querySelector('div.cardData img.img-fluid') ||
                document.querySelector('video.img-fluid') ||
                document.querySelector('img.img-fluid');

            const highResImageUrl = mediaElement?.src || '';
            const cardTitle = mediaElement?.title || mediaElement?.alt || '';

            const breadcrumbItems = Array.from(document.querySelectorAll('.breadcrumb-new li span[itemprop="name"]'))
                .map(el => el.innerText.trim());

            const tierText = breadcrumbItems[1] || null;
            const series = breadcrumbItems[2] || null;
            const titleFromBreadcrumb = breadcrumbItems[3] || null;

            let tier = null;
            if (tierText) {
                const matchNumber = tierText.match(/\d+/);
                if (matchNumber) tier = parseInt(matchNumber[0], 10);
                else tier = tierText.replace(/Tier\s*/i, "").trim();
            }

            // Creators Logic
            const creators = Array.from(document.querySelectorAll('.padded20.user_purchased h1.nice'))
                .filter(h1 => h1.textContent.includes("Creators"))
                .map(h1 => h1.parentElement.querySelector('p')?.innerText.replace("Card Maker:", "").trim())
                .filter(Boolean);

            // Special Attributes Logic
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

            // Want Count Logic
            let wantCount = 0;
            headers.forEach(h1 => {
                if (h1.textContent.includes("People who want this card!")) {
                    const match = h1.textContent.match(/\d+/);
                    wantCount = match ? parseInt(match[0], 10) : 0;
                }
            });

            // Owners Logic (Usernames only)
            const owners = Array.from(
                document.querySelectorAll(".infinitescroll-container > div.inline-block img")
            ).map(img => img.getAttribute("title")).filter(Boolean);

            return {
                highResImageUrl, cardTitle, tier, series, titleFromBreadcrumb,
                creators, specialAttributes, wantCount, owners
            };
        });

        // Tier S / 6 WebM handling (RETAINED)
        if (cardDetails.tier === 6 || cardDetails.tier === 'S') {
            if (cardDetails.highResImageUrl.endsWith('.png')) {
                const baseName = path.basename(cardDetails.highResImageUrl, '.png');
                const folder = cardDetails.tier === 6 ? '6' : 'S';
                cardDetails.highResImageUrl = `https://cdn.shoob.gg/images/cards/${folder}/${baseName}.webm`;
            }
        }

        // Apply all data to the card object
        card.imageUrl = cardDetails.highResImageUrl;
        card.title = cardDetails.cardTitle || cardDetails.titleFromBreadcrumb || card.title;
        card.tier = cardDetails.tier;
        card.series = cardDetails.series;
        card.creators = cardDetails.creators;
        card.owners = [...new Set(cardDetails.owners)];
        card.specialAttributes = cardDetails.specialAttributes;
        card.wantCount = cardDetails.wantCount;
        card.price = generatePrice(cardDetails.tier);
        card.claim = generateClaimCode(6);

    } catch (err) {
        console.error(`Skipping card ${card.id} due to error: ${err.message}`);
    } finally {
        await detailPage.close();
    }
    return card;
}

async function scrapeShoobCards() {
	console.log('🚀 Starting Optimized Parallel Scraper...');

	const browser = await puppeteer.launch({
		headless: true,
		args: [
			'--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
			'--disable-gpu', '--no-zygote', '--window-size=1920,1080'
		],
	});

	const mainPage = await browser.newPage();
	await mainPage.setViewport({ width: 1920, height: 1080 });

    // Main navigation - No fixed sleeps
	try {
		console.log('Navigating to Shoob.gg cards listing...');
		await mainPage.goto('https://shoob.gg/cards/', { waitUntil: 'domcontentloaded', timeout: 60000 });
		await mainPage.waitForSelector('.card-main', { timeout: 15000 });

		const totalText = await mainPage.evaluate(() => document.querySelector('[class*="total"]')?.textContent || '');
		const totalCards = parseInt(totalText.match(/TOTAL\s+(\d+)/i)?.[1] || 0, 10);
		const totalPages = Math.ceil(totalCards / 25) || 2354;

		console.log(`Found ${totalCards} cards. Scraping ${totalPages} pages...`);

		const allCards = [];

		for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
			console.log(`\n📄 Processing Page ${pageNum}/${totalPages}...`);

			if (pageNum > 1) {
				await mainPage.goto(`https://shoob.gg/cards/?page=${pageNum}`, { waitUntil: 'domcontentloaded' });
				await mainPage.waitForSelector('.card-main', { timeout: 15000 });
			}

			// Get listing card IDs
			const cardIds = await mainPage.evaluate(() => {
				return Array.from(document.querySelectorAll('.card-main')).map(card => {
					const link = card.querySelector('a');
					const img = card.querySelector('img');
					return {
						id: link?.href.match(/\/cards\/info\/([^\/\?]+)/)?.[1] || '',
						title: img?.title || img?.alt || '',
						detailUrl: link?.href || ''
					};
				}).filter(c => c.id);
			});

			// --- PARALLEL BATCHING: PROCESS 10 CARDS AT ONCE ---
			for (let i = 0; i < cardIds.length; i += CONCURRENCY_LIMIT) {
				const batch = cardIds.slice(i, i + CONCURRENCY_LIMIT);
				console.log(`  -> Scraping batch ${i/CONCURRENCY_LIMIT + 1} (${batch.length} cards)...`);
				
				const batchResults = await Promise.all(batch.map(card => scrapeCardDetail(browser, card)));
				allCards.push(...batchResults);
			}

			// Save after every page to avoid data loss
			fs.writeFileSync('shoob_cards_enhanced.json', JSON.stringify(allCards, null, 2));
		}

		console.log(`✅ Success! Total cards collected: ${allCards.length}`);
		return allCards;

	} catch (error) {
		console.error('An error occurred:', error);
	} finally {
		await browser.close();
	}
}

// RUN SCRAPER
scrapeShoobCards().then(() => console.log('Scraping Complete.'));
