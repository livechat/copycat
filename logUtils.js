const logTypes = {
    NORMAL: 'normal',
    ERROR: 'error',
    SUCCESS: 'success',
}

const logColors = {
    [logTypes.NORMAL]: '\x1b[0m',
    [logTypes.ERROR]: '\x1b[31m',
    [logTypes.SUCCESS]: '\x1b[32m',
}

log = (text, type = 'normal') => {
    console.log(logColors[type], '> ' + text + logColors['normal'])
}

module.exports = {
    log, logTypes,
}
