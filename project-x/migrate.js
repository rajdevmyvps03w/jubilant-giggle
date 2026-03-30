import axios from "axios"
import { load } from "cheerio"
import { fileTypeFromBuffer } from "file-type"

;(async () => {
    const { data } = await axios.get("https://qu.ax/dwe2A")

    const $ = load(data)

    const src = $(".file-container img").attr("src")
    const fileUrl = new URL(src, "https://qu.ax").href

    const res = await axios.get(fileUrl, {
        responseType: "arraybuffer",
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
            "Referer": "https://qu.ax/"
        }
    })

    const buffer = Buffer.from(res.data)

    console.log(buffer.length)

    const type = await fileTypeFromBuffer(buffer)

    console.log(type)
})()