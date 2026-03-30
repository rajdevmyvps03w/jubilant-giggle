import { readdir, appendFile, writeFile } from 'fs/promises'
import { join, resolve } from 'path'
import { pathToFileURL } from 'url'

export const plugins = []

export const plugin = (meta, run) => {
    const cmd = {
        name: meta.name,
        aliases: meta.aliases || [],
        isAdmin: !!meta.isAdmin,
        isBotAdmin: !!meta.isBotAdmin,
        isDev: !!meta.isDev,
        isGroup: !!meta.isGroup,
        isPrivate: !!meta.isPrivate,
        category: meta.category || 'misc',
        content: meta.description?.content || '',
        usage: meta.description?.usage || '',
        example: meta.description?.example || '',
        run
    }
    plugins.push(cmd)
    return cmd
}

const LOG_FILE = resolve(process.cwd(), 'plugin-errors.log')

const logError = async (filePath, err) => {
    const timestamp = new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
    const line = `[${timestamp}] ❌ FAILED: ${filePath}\n` + `  ${err?.stack ?? err}\n` + `${'─'.repeat(60)}\n`

    await appendFile(LOG_FILE, line, 'utf8').catch(() => {})
}

export const loadPlugins = async (directory = 'src/plugins') => {
    console.log('[Plugins] 🔌 Loading plugins...')
    const rootDir = resolve(process.cwd(), directory)

    // Clear the log file at the start of each load so it only has errors from this session
    await writeFile(LOG_FILE, `Plugin load — ${new Date().toLocaleString('en-GB')}\n${'═'.repeat(60)}\n`, 'utf8').catch(
        () => {}
    )

    let failed = 0

    try {
        const categories = await readdir(rootDir, { withFileTypes: true })

        for (const category of categories) {
            if (!category.isDirectory()) continue

            const categoryPath = join(rootDir, category.name)
            const files = await readdir(categoryPath)
            const jsFiles = files.filter((f) => f.endsWith('.js'))

            // Load files one-by-one so a single bad file doesn't cancel the rest
            for (const file of jsFiles) {
                const filePath = pathToFileURL(join(categoryPath, file)).href
                try {
                    await import(filePath)
                } catch (err) {
                    failed++
                    const shortPath = `${category.name}/${file}`
                    console.error(`  ❌ Failed to load: ${shortPath} — ${err.message}`)
                    await logError(shortPath, err)
                }
            }
        }

        const status =
            failed > 0
                ? `[Plugins] ⚠️  Loaded ${plugins.length} plugins (${failed} failed — see plugin-errors.log)`
                : `[Plugins] ✅ Successfully loaded ${plugins.length} plugins from "${directory}"`

        console.log(status)

        if (failed > 0) {
            await appendFile(LOG_FILE, `\nSummary: ${plugins.length} loaded, ${failed} failed.\n`, 'utf8').catch(
                () => {}
            )
        }
    } catch (error) {
        console.error('❌ Error reading plugin directory:', error)
        await logError(directory, error)
    }
}
