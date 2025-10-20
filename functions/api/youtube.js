const express = require("express");
const ytdl = require("@distube/ytdl-core");

const yt = express.Router();
const agent = ytdl.createAgent(undefined, {
	localAddress: undefined,
});

yt.get("/info", async (req, res) => {
	try {
		const { url } = req.query;

		if (!url) return res.status(400).json({ error: "Missing YouTube URL" });
		if (!ytdl.validateURL(url))
			return res.status(400).json({ error: "Invalid YouTube URL" });

		const info = await ytdl.getInfo(url);

		const seen = new Set();
		const qualityList = info.formats
			.filter((f) => f.hasAudio)
			.map((f) => ({
				qualityLabel: f.qualityLabel || f.audioBitrate + "kbps",
				container: f.container,
				itag: f.itag,
				bitrate: f.bitrate,
				fileSizeMB: f.contentLength
					? (f.contentLength / (1024 * 1024)).toFixed(2)
					: null,
				mediaType: f.mimeType.split(";")[0],
			}))
			.filter((f) => {
				// create a unique key based on quality + container + media type
				const key = `${f.qualityLabel}-${f.container}-${f.hasAudio}-${f.hasVideo}`;
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});

		res.json({
			title: info.videoDetails.title,
			author: info.videoDetails.author.name,
			duration: info.videoDetails.lengthSeconds,
			thumbnail:
				info.videoDetails.thumbnails?.pop()?.url ||
				"https://via.placeholder.com/480x360",
			qualities: qualityList,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Failed to fetch video info." });
	}
});

yt.get("/download", async (req, res) => {
	try {
		const { url, itag } = req.query;

		if (!url) return res.status(400).send("Missing YouTube URL");
		if (!itag) return res.status(400).send("Missing format itag");
		if (!ytdl.validateURL(url))
			return res.status(400).send("Invalid YouTube URL");

		const info = await ytdl.getInfo(url, {
			agent,
			// Add these options to help with parsing
			lang: "en",
			requestOptions: {
				headers: {
					cookie: process.env.YOUTUBE_COOKIES || "", // Add cookies if you have them
				},
			},
		});
		const title = info.videoDetails.title
			.replace(/[^\w\s]/gi, "_")
			.replace(/\s+/g, " ")
			.trim()
			.substring(0, 50);
		// const title = info.videoDetails.title
		// 	.replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
		// 	.replace(/\s+/g, " ")
		// 	.trim()
		// 	.substring(0, 200);

		const format = ytdl.chooseFormat(info.formats, { itag });

		res.header(
			"Content-Disposition",
			`attachment; filename="${title}.${format.container}"`
		);
		res.header("Content-Type", format.mimeType.split(";")[0]);

		const stream = ytdl(url, {
			format,
			// highWaterMark: 1 << 25,
			agent,
		});

		stream.on("error", (err) => {
			console.error("Stream error:", err.message);
			if (!res.headersSent) {
				res.status(500).send("Error streaming video");
			}
		});

		stream.pipe(res);
	} catch (err) {
		console.error("Download error:", err.message);

		if (!res.headersSent) {
			res.status(500).send("Error processing video");
		}
	}
});

module.exports = yt;
