const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const app = express()
const jsonParser = bodyParser.json()
const flatten = require('lodash/fp/flatten')
const find = require('lodash/fp/find')
const filter = require('lodash/fp/filter')
const startsWith = require('lodash/fp/startsWith')
const GitHubApi = require('github')

const config = require('./config.json')

const github = new GitHubApi({
    debug: true,
    protocol: "https",
    headers: {
        "user-agent": config.userAgent
    },
    followRedirects: false,
    timeout: 5000
});

github.authenticate({
    type: "token",
    token: config.token,
});

const syncConfig = {
    syncAccountName: config.syncAccountName,
    syncFiles: config.syncFiles
}

const getFileContent = (owner, repository, file, branch) => {
    return new Promise((resolve, reject) => {
        github.repos.getContent({
            owner: owner,
            repo: repository,
            path: file,
            ref: branch,
        }, (error, response) => {
            if (error) {
                return reject(error)
            }
            resolve(response)
        })
    })
}

const updateFile = (owner, repo, path, branch, sha, content) => {
    return new Promise((resolve, reject) => {
        github.repos.updateFile({
            owner: owner,
            repo: repo,
            path: path,
            message: 'Synchronize ' + path,
            content: content,
            sha: sha,
            branch: branch,
        }, (error, response) => {
            if (error) {
                return reject(error)
            }
            resolve(response)
        })
    })
}

const createFile = (owner, repo, path, branch, content) => {
    return new Promise((resolve, reject) => {
        github.repos.createFile({
            owner: owner,
            repo: repo,
            path: path,
            message: 'Synchronize ' + path,
            content: content,
            branch: branch,
        }, (error, response) => {
            if (error) {
                return reject(error)
            }
            resolve(response)
        })
    })
}

const copyFileBetweenRepositories = (from, to) => {
    const orginalResponsePromise = getFileContent(from.owner, from.repository, from.file, from.branch)
    const destinationResponsePromise = getFileContent(to.owner, to.repository, to.file, to.branch)
        .catch((error) => {
            console.log('no destination', error)
            return false
        })
    return Promise.all([ orginalResponsePromise, destinationResponsePromise ])
        .then((responses) => {
            const [ orginalResponse, destinationResponse ] = responses
            if (!destinationResponse) {
                return createFile(to.owner, to.repository, to.file, to.branch, orginalResponse.data.content)
            }
            updateFile(to.owner, to.repository, to.file, to.branch, destinationResponse.data.sha, orginalResponse.data.content)
        })
}

const getFileDestinations = (branch, repo, owner, file) => {
    const fileInConfig = filter((configFile) => {
        if (configFile.from.repo !== repo) {
            return false
        }
        if (configFile.from.owner !== owner) {
            return false
        }
        if (startsWith(configFile.from.path, file) && configFile.refsMap[branch]) {
            return true
        }
    }, syncConfig.syncFiles)
    return fileInConfig
}

app.post('/webhook/push', jsonParser, (req, res) => {

    console.log('> Received webhook')

    const { body } = req
    const { ref, repository, commits, pusher } = body
    const { owner } = repository

    // Ignore commits if commit author is bot - avoid loop sync commits
    if (owner.name === syncConfig.syncAccountName) {
        return res.send('ok')
    }
    
    const branchName = ref.split('/')[2]
    
    // Filter only distinct commits
    const filteredCommits = filter((commit) => {
        return !commit.distinct
    }, commits)
    const modifiedFiles = flatten(filteredCommits.map((commit) => {
        return commit.modified
    }))

    const syncDestinations = flatten(modifiedFiles.map((file) => {
        const destinations = getFileDestinations(branchName, repository.name, owner.name, file)
        if (destinations && destinations.length) {
            const parsedDestinations = destinations.map((destination) => {
                return {
                    from: {
                        file: file,
                        branch: branchName, 
                        repository: repository.name, 
                        owner: owner.name,
                    },
                    to: {
                        file: destination.to.path + path.basename(file),
                        branch: destination.refsMap[branchName],
                        repository: destination.to.repo,
                        owner: destination.to.owner
                    },
                }
            })
            return parsedDestinations
        }
        return false
    }))

    syncDestinations.reduce((promise, destination) => {
        return promise
            .catch((error) => console.log('> error', error))
            .then(() => copyFileBetweenRepositories(destination.from, destination.to))
    }, Promise.resolve([]))

    console.log('> Webhook parsed, sending response')
    res.send('ok')
})

app.listen(3081, function () {
  console.log('Github Synchronizator listening on 3081!')
})
