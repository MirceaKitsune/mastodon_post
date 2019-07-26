# Mastodon Posting script

A script for the Mastodon social network written in Node.js which lets a bot fetch content from the JSON API of other websites and post it in the timeline. The script must be customized to recognize the data delivered by the site in cause, and contains parameters to easily adjust the names of relevant fields. This script is primarily intended for bots posting content from art sites, such as e621 or Derpibooru. Note that it's not intended for websites that require an access token to use their search API, but can be easily customized to support those as well.

https://docs.joinmastodon.org/api

## Instructions

- Find a website that delivers image content through a JSON compatible API. Open an example URL in your browser so you can observe the content of each field per entry. Adjust the name of the website, the format of the request URL, as well as the names of the parameters inside the script.
- Go to the settings panel of the Mastodon bot that will be posting the content. Select "Development" and click "New application". Create a new app and give it full Write permissions. Navigate to it and copy its Access Token, then paste the character string into the script's token setting. Now set the name of the target site to this instance.
- Open a bash prompt and type "node ./post.js". The timer will start and the bot should post a new item in the interval specified in the configuration. We recommend adding the command to your system autostart so the script can automatically begin working when your computer starts.
