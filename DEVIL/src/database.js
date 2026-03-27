// database.js
require('../settings');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class JsonDB {
	constructor(file = global.josephDatabase) {
		this.data = {};
		this.file = path.join(process.cwd(), 'database', file);
		this.isWriting = false;
		this.writePending = false;
	}

	// Read database
	read = async () => {
		let data;

		if (fs.existsSync(this.file)) {
			try {
				// Read with UTF-8 encoding
				let fileData = fs.readFileSync(this.file, 'utf8');

				// If file is empty, reset
				if (!fileData || fileData.trim() === "") {
					console.log(chalk.yellow("⚠️ Empty JSON file detected, resetting..."));
					fileData = "{}";
					fs.writeFileSync(this.file, fileData);
				}

				data = JSON.parse(fileData);

			} catch (e) {
				console.log(chalk.red("❌ JSON Corrupted, trying backup..."));

				try {
					// Try backup
					if (fs.existsSync(this.file + '.bak')) {
						let backupData = fs.readFileSync(this.file + '.bak', 'utf8');

						if (!backupData || backupData.trim() === "") {
							throw new Error("Backup file also empty");
						}

						data = JSON.parse(backupData);

						// Restore backup
						fs.writeFileSync(this.file, JSON.stringify(data, null, 2));
						console.log(chalk.green("✅ Backup restored successfully"));
					} else {
						throw new Error("No backup found");
					}
				} catch (err) {
					console.log(chalk.red("❌ Backup also failed, creating fresh DB..."));
					data = this.data;
					fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
				}
			}
		} else {
			// File doesn't exist, create fresh
			data = this.data;
			fs.mkdirSync(path.dirname(this.file), { recursive: true });
			fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
		}

		return data;
	}

	// Write database
	write = async (data) => {
		this.data = data || global.db || {};

		if (this.isWriting) {
			this.writePending = true;
			return;
		}

		this.isWriting = true;

		try {
			let dirname = path.dirname(this.file);
			if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true });

			// Backup current file
			if (fs.existsSync(this.file)) {
				fs.copyFileSync(this.file, this.file + '.bak');
			}

			// Write only if data exists
			if (Object.keys(this.data).length > 0) {
				fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
			}

		} catch (e) {
			console.error('❌ Write Database failed: ', e);
		} finally {
			this.isWriting = false;

			// If pending write exists, write again
			if (this.writePending) {
				this.writePending = false;
				await this.write(this.data);
			}
		}
	}
}

// Factory function for JsonDB or MongoDB
const dataBase = (source) => {
	if (/^mongodb(\+srv)?:\/\//i.test(source)) {
		return new MongoDB(source);
	}
	return new JsonDB(source);
}

module.exports = { dataBase };

// Hot reload for this file
let file = require.resolve(__filename);
fs.watchFile(file, () => {
	fs.unwatchFile(file);
	console.log(chalk.redBright(`Update ${__filename}`));
	delete require.cache[file];
	require(file);
});