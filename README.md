<img src="https://static.staging.livechatinc.com/1520/OY0OYN7GUH/fd36406499d70e560c0e61b19fa1a392/copycat.png" alt="Copycat logo" width="200px">

# Copycat

Synchronize files between repositories. This tool:
- creates a web server,
- listens to request,
- parses github webhooks,
- creates pull request to target repostitory with changes from source repository

<img src="https://static.staging.livechatinc.com/1520/OY0O0Q2OFU/c8d6a88d4a2467e03c993acaddd445f7/copycat-chart.png" alt="Copycat - how it works" width="400px">

## Use cases

- Synchronize documentation betweend project repository and documentation repository
- Share code between multiple projects
- Connect monorepo with project's own repository

## Requirements

- node.js > 7.10

## Installation

Copy `config.json.tpl` as `config.json` and update config:

- token - Github account's token you want to use for synchronization
- userAgent - will be used in requests to Github API
- syncAccountName - name of the account used to synchronization
- syncFiless - array of objects with sync config

Example config.json:

```json
{
    "token": "xxx",
    "userAgent": "Copycat-Docs-Synchronizer",
    "syncAccountName": "livechat-docs-synchronizer",
    "pullRequestBranchPrefix": "update-libs-",
    "syncFiles": [
        {
            "from": {
                "owner": "livechat",
                "repo": "copycat",
                "path": "lib/"
            },
            "to": {
                "owner": "livechat",
                "repo": "copycat-lib-only",
                "path": "lib/"
            },
            "refsMap": {
                "labs": "labs",
                "master": "master"
            }
        }
    ]
}

```

## Start

`npm run start`

## Testing

To test copycat you'll need to expose local server (crated by copycat during `npm run start` command) to public and add webhook to github repository.
To expose local server you can use [ngrok](https://ngrok.com/). Detailed description is available in [Configuring Your Server](https://developer.github.com/webhooks/configuring/) github's documentation section.
```
./ngrok http 3081
```
Next, [set up github](https://developer.github.com/webhooks/creating/) to send webook requests to your local machine.

Copy address created by ngrok:

<img src="https://static.staging.livechatinc.com/1520/OY0O0S6C34/5758871df367f1d68cc246dc3dc39331/config1.png" alt="ngrok screenshot - exposed address">

To your github webhook settings:

<img src="https://static.staging.livechatinc.com/1520/OY0O0S6C34/4a728e5227c1d1e45dd63d39b0f691d4/config2.png" alt="github screenshot - webhook setting">

## Deployment

Ther easiest way to deploy this software is to use "node as a service" provider. 
-  You can use [AWS Elastic Beanstalk](https://aws.amazon.com/elasticbeanstalk/), [Heroku](https://heroku.com) or [Zeit](https://zeit.co/) to run copycat.
-  After deployment, add webhook to your GitHub repository:
    1. Go to repository setting > webhooks > Add webhook
    2. Insert there url of your deployed service, e.g. http://copycat.example.org/webhook/push

# Changelog

#### [v0.0.2] - 22.11.2017
Fix destination directory

#### [v0.0.1] - 2.11.2017
First public Release
