const mapSeries = (fn, arr) => {
  return arr.reduce((promise, el) => promise.then(() => fn(el)), Promise.resolve())
}

module.exports = {
  mapSeries,
}
