var
Connection = require('ssh2'),
util = require('util'),
events = require('events'),
RE_UPTIME=/(\d{2}:\d{2}:\d{2}) up (\d*) days?, +(\d{1,2}:\d{1,2}), +(\d*) users, +load average: +(\d*,\d*), +(\d*,\d*), +(\d*,\d*)/;
// ubuntu 13.04: " 15:54:04 up 1 day,  6:23,  3 users,  load average: 0,13, 0,07, 0,05 "
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
						"script": "uptime",
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
	/*jslint unparam: true */
	ssh.exec('uptime', function(err, stream) {
		if (err) {
			return cb(err);
		}
		stream.on('data', function(data, extended) {
			var
			result,
			match,
			error;

			if (extended === 'stderr') {
				return cb(new Error(data.toString()));
			}
			match = data.toString().match(RE_UPTIME);
			if (match === null) {
				error = new Error('uptime result parse error (' + data.toString() + ')');
				error.code = 'EPARSEERROR';
				return cb(error);
			}
			result = {
				date: match[1],
				upday: match[2],
				uptime: match[3],
				users: match[4],
				last1MinLoadAverage: match[5],
				last5MinLoadAverage: match[6],
				last15MinLoadAverage: match[7]
			};

			/*" 22:23:50 up  2:45,  2 users,  load average: 0,00, 0,04, 0,08" */
			//progressLog(JSON.stringify(result));
			return cb(undefined, result);
		});
		stream.on('end', function() {
			//progressLog('Stream :: EOF');
			return;
		});
		stream.on('close', function() {
			//progressLog('Stream :: close');
			return;
		});
		stream.on('exit', function(code, signal) {
			//progressLog('Stream :: exit :: code: ' + code + ', signal: ' + signal);
			ssh.end();
		});
	});
};