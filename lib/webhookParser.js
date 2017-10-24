const path = require('path')
const compose = require('lodash/fp/compose')
const mapValues = require('lodash/fp/mapValues')
const groupBy = require('lodash/fp/groupBy')
const uniq = require('lodash/fp/uniq')
const flatMap = require('lodash/fp/flatMap')
const flatten = require('lodash/fp/flatten')
const filter = require('lodash/fp/filter')
const startsWith = require('lodash/fp/startsWith')
const concat = require('lodash/fp/concat')

const { log, logTypes } = require('./logUtils')

const getFileDestinations = (branch, repo, owner, file, config) => {
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
	}, config.syncFiles).map((data) => ({
	  ...data,
	  file,
	}))
	return fileInConfig
  }

const groupDesinationsByOwnerRepositoryBranch = compose(
	mapValues(mapValues(groupBy(data => data.to.branch))),
	mapValues(groupBy(data => data.to.repository)),
	groupBy(data => data.to.owner)
  )

const getSyncDestinations = (branchName, repository, owner, modifiedFiles, config) => (
	flatten(
	  modifiedFiles
		.map(file => getFileDestinations(branchName, repository.name, owner.name, file, config))
		.filter(destinations => destinations && destinations.length)
		.map(destinations =>
		  destinations.map(destination => ({
			from: {
			  file: destination.file,
			  branch: branchName,
			  repository: repository.name,
			  owner: owner.name,
			},
			to: {
			  file: destination.to.path + path.basename(destination.file),
			  branch: destination.refsMap[branchName],
			  repository: destination.to.repo,
			  owner: destination.to.owner,
			},
		  }))
		)
	)
)

const getModifiedFiles = (commits) => uniq(flatMap(commit => concat(commit.modified, commit.added), commits))

const parseWebhook = ({ ref, repository, commits }, config) => {
	const { owner } = repository
	const branchName = ref.split('/')[2]
	const modifiedFiles = getModifiedFiles(commits)
	log('modifiedFiles: ' + modifiedFiles)
	const syncDestinations = getSyncDestinations(branchName, repository, owner, modifiedFiles, config)
	const groupedDestinations = groupDesinationsByOwnerRepositoryBranch(syncDestinations)
	return groupedDestinations
}

module.exports = {
	parseWebhook
}
