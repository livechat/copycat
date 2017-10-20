const tasks = [
	'prettier --print-width=120 --single-quote --no-semi --trailing-comma=es5 --write',
	'git add',
]

module.exports = {
  'lib/**/*.js': tasks,
}
