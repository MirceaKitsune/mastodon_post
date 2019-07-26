// Mastodon bot script
// https://docs.joinmastodon.org/api

// NOTICE: You will need to customize this script to fit the instance it will be posting to, as well as the search API it fetches from
// Search this file for "REQUIRED:" to find the lines that need to be changed from their defaults and information on how to change them

// Global: The name of this script
const NAME = "mastodon_mybot"; // REQUIRED: Change this to the name of your bot
// Global: Minimum number of minutes in which the bot will attempt to post
const INTERVAL_MIN = 120;
// Global: Maximum number of minutes in which the bot will attempt to post
const INTERVAL_MAX = 240;

// Source: The URL of the website
const WEBSITE = "website.com"; // REQUIRED: Change this to the name of the website delivering the search results
// Source: User agent
const AGENT = "Node.js Mastodon bot (by MirceaKitsune)";
// Source: Maximum number of entries per search, one is picked randomly from this pool
const COUNT = 10;
// Source: The number of entries to remember in order to avoid repetitive posting
const COUNT_HISTORY = 100;
// Source: The minimum score a submission must have in order to be considered
const SCORE = 0;
// Source: The keywords to search for, separated by commas
const KEYWORDS = "art"; // REQUIRED: Set this to the tags you wish to fetch from the API
// Source: Whether to include NSFW content in requests
const NSFW = false;

// Target, Instance: The URL of the instance
const INSTANCE = "mastodon.social"; // REQUIRED: Edit this to the website of your instance
// Target, Instance: The access token configured in the account settings
const TOKEN = ""; // REQUIRED: Set this to the access token of the application configured in your account
// Target, Instance: How long to attempt accessing the instance, in seconds
const TIMEOUT = 60;
// Target, Instance: The number of characters allowed in a post on this instance
const CHAR_LIMIT = 500;

// Target, Posting: The visibility of posts, can be: public, unlisted, private, direct
const VISIBILITY = "public";
// Target, Posting: The spoiler text displayed in the Content Warning field
const SPOILER = "artwork"; // REQUIRED: Edit this to customize the content warning field
// Target, Posting: Info string encompassing the author name
const INFO_PREFIX = "#art by ";
const INFO_SUFFIX = ":";
// Target, Posting: Maximum number of extra tags to be added from the source
const TAGS = 10;
// Target, Posting: Indicates if posts may contain sensitive media
const SENSITIVE = true;

// Fields: The names of items in the object returned by the search API
// The entry structure can be found by using examples of the search API in a web browser
const DATA_ID = "id"; // REQUIRED: Point this to the field containing the ID of the submission
const DATA_FILE = "file"; // REQUIRED: Point this to the field containing the URL of the source file
const DATA_INFO = "info"; // REQUIRED: Point this to the field containing the description of the submission
const DATA_AUTHOR = "author"; // REQUIRED: Point this to the field containing the namel of the author
const DATA_TAGS = "tags"; // REQUIRED: Point this to the field containing the tags of the submission (CSV expected, customize below otherwise)
const DATA_SOURCE = "source"; // REQUIRED: Point this to the field containing the URL to the submission page
const DATA_SCORE = "score"; // REQUIRED: Point this to the field containing the score of the submission

// Require dependency modules
const https = require("https");
const fs = require("fs");
const mastodon = require("mastodon");

// Spawn a new Mastodon instance
var server = new mastodon({
	access_token: TOKEN,
	timeout_ms: TIMEOUT * 1000,
	api_url: "https://" + INSTANCE + "/api/v1/",
});

// Log a message to the console
function message(text) {
	const date = new Date();
	console.log(date.toUTCString() + ": " + text);
}

// Data, Post: Post the data to the target API
// #5 in the chain: Called when data_format succeeds
function data_post(fileurl, text) {
	const media_filename = NAME + "_media";
	var media_file = fs.createWriteStream(media_filename);

	// Execute posting to Mastodon
	media_file.on("finish", function() {
		try {
			// Post to Mastodon: Upload the local file
			server.post("media", {file: fs.createReadStream(media_filename)}).then(function(response) {
				// Post to Mastodon: Create the post
				server.post("statuses", {status: text, media_ids: [response.data.id], sensitive: SENSITIVE, spoiler_text: SPOILER, visibility: VISIBILITY});

				// Remove the local file
				fs.unlink(media_filename, function(error) {
					if(error != null)
						message("Error: Could not remove media file.");
				});
			});
		} catch(error) {
			message("Error: Failed to upload media and create post.");
		}
	}).on("error", function(error) {
		message("Error: Could not read media file.");
	});

	// Request the file from the server and save it as a local file
	// file.on will execute when this succeeds
	https.get(fileurl, function(response) {
		response.pipe(media_file);
	});
}

// Data, Format: Extract meaningful data from the JSON array and format it accordingly
// #4 in the chain: Called when data_pick succeeds, calls data_post on success
function data_format(object) {
	if(!object[DATA_ID] || object[DATA_ID] == "")
		return;
	if(!object[DATA_FILE] || object[DATA_FILE] == "")
		return;

	var text = "";

	// Text: Add author info
	if(object[DATA_AUTHOR] && object[DATA_AUTHOR] != "")
		text += INFO_PREFIX + object[DATA_AUTHOR] + INFO_SUFFIX + "\n\n";

	// Text: Add source, fallback to the submission link if none is provided
	if(object[DATA_SOURCE] && object[DATA_SOURCE] != "")
		text += object[DATA_SOURCE] + "\n\n";
	else
		text += "https://" + WEBSITE + "/" + object[DATA_ID] + "\n\n";

	// Text: Add tags
	var tags_string = "";
	var tags_array = object[DATA_TAGS].split(",");
	for(var i = tags_array.length - 1; i > 0; i--) {
		// Shuffle the table to randomize tags instead of leaving them in alphabetical order
		const j = Math.floor(Math.random() * (i + 1));
		[tags_array[i], tags_array[j]] = [tags_array[j], tags_array[i]];
	}
	for(var i = 0; i < Math.min(tags_array.length, TAGS); i++) {
		// 1: Remove the space at the beginning of each tag
		// 2: Replace all spaces with underlines
		// 3: Pick the second half after the : symbol
		var tag = tags_array[i];
		tag = tag.substring(1);
		tag = tag.replace(/ /g, "_");
		tag = tag.split(":")[1] || tag;

		if(i > 0) tags_string += " ";
		tags_string += "#" + tag;
	}
	text += tags_string + "\n\n";

	// Text: Add description
	if(object[DATA_INFO] && object[DATA_INFO] != "")
		text += object[DATA_INFO];

	// Text: Limit the description to the maximum character limit of the instance
	if(text.length + SPOILER.length > CHAR_LIMIT)
		text = text.substr(0, CHAR_LIMIT - SPOILER.length - 3) + "...";

	// Proceed if we have valid data
	data_post(object[DATA_FILE], text);
}

// Data, Pick: Choose which object from the array of objects returned by the search to pick
// #3 in the chain: Called when data_request succeeds, calls data_format on success
function data_pick(results) {
	const history_filename = NAME + "_history.json";

	// Start by reading the local history file
	fs.readFile(history_filename, function(error, data) {
		// If reading the file fails we assume it doesn't exist and proceed with a fresh id table
		var history = [];
		if(error != null) {
			message("Error: Failed to read data from history table.");
		} else {
			try {
				const history_json = JSON.parse(data);
				history = history_json;
			} catch(error) {
				message("Error: History JSON could not be parsed.");
			}
		}

		// Pick the object with the best score, excluding items that were already posted
		// If an ID is not found in the history table, indexOf will return -1
		var object = null;
		var score_best = 0;
		results.forEach(function(obj) {
			if(obj[DATA_SCORE] >= score_best && obj[DATA_SCORE] >= SCORE && history.indexOf(obj[DATA_ID]) < 0) {
				object = obj;
				score_best = obj[DATA_SCORE];
			}
		});

		// Add the id to the history list, then trim the list to match the maximum number of entries we wish to store
		if(object != null)
			history.push(object[DATA_ID]);
		if(history.length > COUNT_HISTORY)
			history.splice(0, history.length - COUNT_HISTORY);

		// Update the local history file
		fs.writeFile(history_filename, JSON.stringify(history), "utf8", function(error) {
			if(error != null)
				message("Error: Failed to add data to history table.");

			// Proceed once the file has been updated
			if(object != null) {
				message("Proceeding to post submission with ID " + object[DATA_ID] + ".");
				data_format(object);
			} else {
				message("There are no valid submissions to post.");
			}
		});
	});
}

// Data, Request: Get the JSON data from the source API
// #2 in the chain: Called when data_url succeeds, calls data_pick on success
function data_request(url) {
	const options = {
		host: WEBSITE,
		path: url,
		headers: {"user-agent": AGENT},
	};

	https.get(options, function(response) {
		var json = "";
		response.on("data", function(chunk) {
			// Add this chunk of data to the string
			json += chunk;
		}).on("end", function() {
			// Proceed once we have the complete string
			try {
				var results = JSON.parse(json);
				data_pick(results.search);
			} catch(error) {
				message("Error: Search JSON could not be parsed.");
			}
		});
	}).on("error", function(error) {
		message("Error: Could not receive search JSON file.");
	});
}

// Data, URL: Format the URL used to call the source site
// #1 in the chain: Calls data_request on success
function data_url() {
	const url_search = "/search.json?tags=" + KEYWORDS + "&count=" + COUNT + "&nsfw=" + NSFW; // REQUIRED: You must customize the URL based on the parameters the API expects
	data_request(url_search);
}

// Timer, Object: The timer object
var timer = null;

// Timer, Exec: The call executed by the timer
function timer_exec() {
	timer_set();
	data_url();
}

// Timer, Set: Configures the next execution of the timer
function timer_set() {
	// Miliseconds are converted to seconds then to minutes
	const interval = (Math.random() * (INTERVAL_MAX - INTERVAL_MIN) + INTERVAL_MIN);
	timer = clearTimeout();
	timer = setTimeout(timer_exec, interval * 1000 * 60);
	message("Next post scheduled in " + Math.floor(interval) + " minutes.");
}

// Timer, Start: Initialize the timer when the script starts
{
	message("Bot " + NAME + " was initialized.");
	timer_set();
}
