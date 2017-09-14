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

module.exports = {
    getFileContent, updateFile, createFile,
}
