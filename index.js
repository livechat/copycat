const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const app = express()
const jsonParser = bodyParser.json()
const flatten = require('lodash/fp/flatten')
const find = require('lodash/fp/find')
const filter = require('lodash/fp/filter')
const uniq = require('lodash/fp/uniq')
const union = require('lodash/fp/union')
const startsWith = require('lodash/fp/startsWith')
const config = require('./config.json')
const { getFileContent, updateFile, createFile } = require('./githubUtils')
const { log, logTypes } = require('./logUtils')

const syncConfig = {
    syncAccountName: config.syncAccountName,
    syncFiles: config.syncFiles
}

const copyFileBetweenRepositories = (from, to) => {
    const orginalResponsePromise = getFileContent(from.owner, from.repository, from.file, from.branch)
    const destinationResponsePromise = getFileContent(to.owner, to.repository, to.file, to.branch)
        .catch((error) => {
            log('File doesn\'t exist in targeting repository')
            return false
        })
    return Promise.all([ orginalResponsePromise, destinationResponsePromise ])
        .then((responses) => {
            const [ orginalResponse, destinationResponse ] = responses
            if (!destinationResponse) {
                return createFile(to.owner, to.repository, to.file, to.branch, orginalResponse.data.content)
            }
           return updateFile(to.owner, to.repository, to.file, to.branch, destinationResponse.data.sha, orginalResponse.data.content)
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

    log('Received webhook')

    const { body } = req
    const { ref, repository, commits, pusher } = body
    const { owner } = repository

    // Ignore commits if commit author is bot - avoid loop sync commits
    if (owner.name === syncConfig.syncAccountName) {
        log('Webhook parsed, own commit, sending response', logTypes.SUCCESS)
        return res.send('ok')
    }
    
    const branchName = ref.split('/')[2]
    
    // Filter only distinct commits
    const filteredCommits = filter((commit) => {
        return !commit.distinct
    }, commits)
    const modifiedFiles = uniq(flatten(filteredCommits.map((commit) => {
        return union(commit.modified, commit.added)
    })))
    log('modifiedFiles: ' + modifiedFiles)

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
    })).filter(Boolean)
    log('syncDestinations: ' + syncDestinations)

    syncDestinations.reduce((promise, destination) => {
        return promise
            .catch((error) => log('Error: ' + error, logTypes.ERROR))
            .then(() => copyFileBetweenRepositories(destination.from, destination.to))
    }, Promise.resolve([]))

    log('Webhook parsed, sending response', logTypes.SUCCESS)
    res.send('ok')
})

app.listen(3081, function () {
    log('Github Synchronizator listening on 3081!', logTypes.SUCCESS)
})
