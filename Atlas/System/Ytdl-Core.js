import axios from 'axios';
import yts from 'yt-search';

const DL_API = 'https://api.qasimdev.dpdns.org/api/loaderto/download';
const API_KEY = 'xbps-install-Syu';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

class YT {
    // Retry logic function
    static async downloadWithRetry(url, format = 'mp3', retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const { data } = await axios.get(DL_API, {
                    params: { apiKey: API_KEY, format: format, url },
                    timeout: 90000
                });
                if (data?.data?.downloadUrl) return data.data;
                throw new Error('No download URL');
            } catch (err) {
                if (i === retries - 1) throw err;
                console.log(`Download attempt ${i + 1} failed, retrying in 5s...`);
                await wait(5000);
            }
        }
        throw new Error('All download attempts failed');
    }

    static async search(query) {
        const search = await yts(query);
        return search.videos;
    }
}

export default YT;
