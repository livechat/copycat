const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const jsonParser = bodyParser.json()
const reduce = require('lodash/fp/reduce').convert({ cap: false })
const config = require('../config.json')
const { getFileContent, updateFile, createFile, getBranch, createBranch, createPullRequest } = require('./githubUtils')
const { log, logTypes } = require('./logUtils')
const { parseWebhook } = require('./webhookParser')
const { mapSeries } = require('./asyncUtils')

const syncConfig = {
  syncAccountName: config.syncAccountName,
  syncFiles: config.syncFiles,
}

const port = process.env.PORT || 3081

const getCurrentDate = () => new Date().toJSON().replace(/:/g, '-')

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
    if (orginalResponse.data.content === destinationResponse.data.content) {
      log('No changes', logTypes.SUCCESS)
      return true
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

app.post('/webhook/push', jsonParser, (req, res) => {
  log('Received webhook')

  const { body } = req
  const { ref, repository } = body
  const { owner } = repository

  // Ignore commits if commit author is bot - avoid loop sync commits
  if (owner.name === syncConfig.syncAccountName) {
    log('Webhook parsed, own commit, sending response', logTypes.SUCCESS)
    return res.send('ok')
  }
  
  const groupedDestinations = parseWebhook(body, syncConfig)
  if (!groupedDestinations) {
    return res.send('ok')
  }
  const newBranchName = `${config.pullRequestBranchPrefix}${getCurrentDate()}`

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
                      }),
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
                  ).catch(error => log('Pull request failed: ' + error, logTypes.NORMAL))
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

app.listen(port, function() {
  log('Github Synchronizator listening on ' + port, logTypes.SUCCESS)
})
