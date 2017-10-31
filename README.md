<img src="https://static.staging.livechatinc.com/1520/OY0OYN7GUH/fd36406499d70e560c0e61b19fa1a392/copycat.png" alt="Copycat logo" width="200px">

# Copycat

Synchronize files between repositories. This tool:
- creates a web server,
- listens to request,
- parses github webhooks,
- creates pull request to target repostitory with changes from source repository

<img src="https://static.staging.livechatinc.com/1520/OY0O0Q2OFU/c8d6a88d4a2467e03c993acaddd445f7/copycat-chart.png" alt="Copycat - how it works" width="400px">

## Requirements

- node.js > 7.10

## Installation

Copy `config.json.tpl` as `config.json` and update config:

- token - Github account's token you want to use for synchronization
- userAgent - will be used in requests to Github API
- syncAccountName - name of the account used to synchronization
- syncFiless - array of objects with sync config

## Start

`npm run start`
