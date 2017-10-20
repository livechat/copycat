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
const map = require('lodash/fp/map')
const mapValues = require('lodash/fp/mapValues')
const forEach = require('lodash/fp/forEach')
const compose = require('lodash/fp/compose')
const reduce = require('lodash/fp/reduce').convert({ cap: false })
const groupBy = require('lodash/fp/groupBy')
const config = require('../config.json')
const { getFileContent, updateFile, createFile, getBranch, createBranch, createPullRequest } = require('./githubUtils')
const { log, logTypes } = require('./logUtils')

const syncConfig = {
  syncAccountName: config.syncAccountName,
  syncFiles: config.syncFiles,
}

const getCurrentDate = () => new Date().toJSON().replace(/:/g, '-')

const groupDesinationsByOwnerRepositoryBranch = compose(
  mapValues(mapValues(groupBy(data => data.to.branch))),
  mapValues(groupBy(data => data.to.repository)),
  groupBy(data => data.to.owner)
)

const copyFileBetweenRepositories = (from, to) => {
  const orginalResponsePromise = getFileContent(from.owner, from.repository, from.file, from.branch)
  const destinationResponsePromise = getFileContent(to.owner, to.repository, to.file, to.branch).catch(error => {
    log("File doesn't exist in targeting repository")
    return false
  })
  return Promise.all([orginalResponsePromise, destinationResponsePromise]).then(responses => {
    const [orginalResponse, destinationResponse] = responses
    if (!destinationResponse) {
      return createFile(to.owner, to.repository, to.file, to.branch, orginalResponse.data.content)
    }
    return updateFile(
      to.owner,
      to.repository,
      to.file,
      to.branch,
      destinationResponse.data.sha,
      orginalResponse.data.content
    )
  })
}

const getFileDestinations = (branch, repo, owner, file) => {
  const fileInConfig = filter(configFile => {
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
  const filteredCommits = commits
  const modifiedFiles = uniq(
    flatten(
      filteredCommits.map(commit => {
        return union(commit.modified, commit.added)
      })
    )
  )
  log('modifiedFiles: ' + modifiedFiles)

  const syncDestinations = flatten(
    modifiedFiles.map(file => {
      const destinations = getFileDestinations(branchName, repository.name, owner.name, file)
      if (destinations && destinations.length) {
        const parsedDestinations = destinations.map(destination => {
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
              owner: destination.to.owner,
            },
          }
        })
        return parsedDestinations
      }
      return false
    })
  ).filter(Boolean)
  log('syncDestinations: ' + JSON.stringify(syncDestinations))

  if (!syncDestinations.length) {
    return res.send('ok')
  }
  const newBranchName = `${config.pullRequestBranchPrefix}${getCurrentDate()}`
  const groupedDestinations = groupDesinationsByOwnerRepositoryBranch(syncDestinations)

  reduce(
    (result, repositories, owner) => {
      return reduce(
        (result, branches, repository) => {
          return reduce(
            (result, files, branch) => {
              const newBranchName = `${config.pullRequestBranchPrefix}${getCurrentDate()}`
              return getBranch(owner, repository, branch)
                .then(getBranchResponse => {
                  const { data } = getBranchResponse
                  const { sha: destinationSha } = data.object
                  return createBranch(owner, repository, newBranchName, destinationSha)
                })
                .then(() => {
                  return mapSeries(
                    destination =>
                      copyFileBetweenRepositories(destination.from, {
                        ...destination.to,
                        branch: newBranchName,
                      }).catch(error => log('Error: ' + error, logTypes.ERROR)),
                    files
                  )
                })
                .then(() => {
                  return createPullRequest(
                    owner,
                    repository,
                    `Synchronize files from ${repository}`,
                    newBranchName,
                    branch,
                    'Synchronize files'
                  )
                })
                .catch(error => log('Error: ' + error, logTypes.ERROR))
            },
            Promise.resolve([]),
            branches
          )
        },
        Promise.resolve([]),
        repositories
      )
    },
    Promise.resolve([]),
    groupedDestinations
  ).catch(error => log('Error: ' + error, logTypes.ERROR))

  log('Webhook parsed, sending response', logTypes.SUCCESS)
  res.send('ok')
})

app.listen(3081, function() {
  log('Github Synchronizator listening on 3081!', logTypes.SUCCESS)
})
