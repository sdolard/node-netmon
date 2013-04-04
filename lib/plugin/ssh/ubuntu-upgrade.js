var sshshell = require('./_ssh-shell');

/*
TASK CONFIG EXAMPLE
{
	"enabled": true,
	"action": "ssh",
	"description": "ubuntu-upgrade",
	"config": {
		"script": "ubuntu-upgrade",
		"host": <HOST>,
		"login": <login>,
		"pwd": <pwd>
	}
}
*/
exports.run = function (id, config, ssh, cb, progressLog) {
	sshshell.run(id, config, ssh, cb, progressLog,
		[
		'sudo apt-get update',
		'sudo apt-get upgrade -y'
		]
	);
};