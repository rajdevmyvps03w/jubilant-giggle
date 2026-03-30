import fs from "fs"
import path from "path"

const ROOT = "./"              // change to your folder
const OUTPUT = "repo_dump.txt"

const IGNORE = new Set(["node_modules", "session", ".git"])

let tree = ""
let content = ""

function walk(dir, prefix = "") {
    const items = fs.readdirSync(dir, { withFileTypes: true })

    items.forEach((item, index) => {
        if (IGNORE.has(item.name)) return

        const fullPath = path.join(dir, item.name)
        const isLast = index === items.length - 1
        const connector = isLast ? "└── " : "├── "

        tree += `${prefix}${connector}${item.name}\n`

        if (item.isDirectory()) {
            walk(fullPath, prefix + (isLast ? "    " : "│   "))
        } else if (item.name.endsWith(".js")) {
            const fileData = fs.readFileSync(fullPath, "utf8")

            content += `\n\n===== FILE: ${fullPath} =====\n\n`
            content += fileData
        }
    })
}

walk(ROOT)

const finalOutput =
`========== FILE TREE ==========\n\n${tree}
\n\n========== JS FILE CONTENT ==========\n${content}`

fs.writeFileSync(OUTPUT, finalOutput)

console.log("Saved to", OUTPUT)