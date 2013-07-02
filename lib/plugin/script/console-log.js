/*
TASK CONFIG EXAMPLE
{
	"crontab": [
		{
			"cronTime": "* * * * * *",
			"description": "Each seconds",
			"enabled": true,
			"task": [
				{
					"enabled": true,
					"action": "script",
					"description": "console log (cronTime tester)",
					"config": {
						"script": "console-log",
						"log": "Hello world"
					}
				}
			]
		}
	]
}


*/

/**
* @param {Object} config
* @param {Writable Stream} ws. Default to process.stdout
* @param {Function} callback({Error}err, {Object} response) called when request is done
*/
function run(id, config, cb, progressLog) {
	progressLog('it will log.');
	console.log("id %s: log > %s", id, config.log);
	progressLog('it has log.');
	cb();
}

exports.run = run;

