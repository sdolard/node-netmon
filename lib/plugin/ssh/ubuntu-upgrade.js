var sshshell = require('./_ssh-shell');

/*
TASK CONFIG EXAMPLE
{
	"jobs": [
		{
			"cronTime": "* * * * * *",
			"description": "ssh test",
			"enabled": true,
			"runOnce": true,
			"task": [
				{
					"enabled": true,
					"action": "ssh",
					"description": "ssh uptime",
					"config": {
						"debug": true,
						"script": "ubuntu-upgrade",
						"host": "<host>",
						"login": "<login>",
						"pwd": "<pwd>"
					}
				}
			]
		}
	]
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