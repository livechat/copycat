<img src="https://static.staging.livechatinc.com/1520/OY0OYN7GUH/fd36406499d70e560c0e61b19fa1a392/copycat.png" alt="Copycat logo" width="200px">

# Copycat

Copycat is a tool to synchronize files between repositories.

It can:
- create a web server,
- listen to requests,
- parse GitHub webhooks,
- create pull requests to the target repository with the changes from the source repository

<img src="https://static.staging.livechatinc.com/1520/OY0O0Q2OFU/c8d6a88d4a2467e03c993acaddd445f7/copycat-chart.png" alt="Copycat - how it works" width="400px">

## Use cases

You can use Copycat to:

- synchronize documentation between project repository and documentation repository
- share code between multiple projects
- connect a monorepo to a project's own repository

## Getting Started

These instructions will get you Copycat up and running on your local machine

### Prerequisites

To run Copycat, you will need node.js > 7.10.

### Installation

Copy `config.json.tpl` as `config.json` and update config:

- token – Github account's token you want to use for synchronization
- userAgent – it will be used in requests to Github API
- syncAccountName – the name of the account used for synchronization
- syncFiles – an array of objects with the sync config

A sample config.json:

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

### Start

To start Copycat, run `npm run start`

## Testing

To test Copycat, you'll need to expose your local server (created by Copycat with the npm run start command) to public and add a webhook to your GitHub repository.

### Expose the server

To expose the local server, you can use [ngrok](https://ngrok.com/). A detailed description is available in the [Configuring Your Server](https://developer.github.com/webhooks/configuring/) section in the GitHub documentation.

```
./ngrok http 3081
```

### Send webhook requests

Next, [set up github](https://developer.github.com/webhooks/creating/) to send webook requests to your local machine.

1. Copy the address created by ngrok:

<img src="https://static.staging.livechatinc.com/1520/OY0O0S6C34/5758871df367f1d68cc246dc3dc39331/config1.png" alt="ngrok screenshot - exposed address">

2. Paste it to your GitHub webhook settings:

<img src="https://static.staging.livechatinc.com/1520/OY0O0S6C34/4a728e5227c1d1e45dd63d39b0f691d4/config2.png" alt="github screenshot - webhook setting">

## Deployment

The easiest way to deploy Copycat is to use a "node as a service" provider ([AWS Elastic Beanstalk](https://aws.amazon.com/elasticbeanstalk/), [Heroku](https://heroku.com) or [Zeit](https://zeit.co/)).

After the deployment, add a webhook to your GitHub repository
1. Go to your repository’s Settings > Webhooks > Add webhook
2. Paste there the URL of your deployed service, e.g. http://copycat.example.org/webhook/push

# Changelog

#### [v0.0.2] - 22.11.2017
Fix destination directory

#### [v0.0.1] - 3.11.2017
First public Release

# Authors

[Konrad Kruk](https://twitter.com/konradkpl) / LiveChat

[Mateusz Burzyński](https://twitter.com/AndaristRake) / LiveChat

# License

This project is licensed under the MIT License 
