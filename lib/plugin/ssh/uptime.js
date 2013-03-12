var
Connection = require('ssh2'),
util = require('util'),
events = require('events'),
RE_UPTIME=/(\d{2}:\d{2}:\d{2}) up +(\d{1,2}:\d{1,2}), +(\d*) users, +load average: +(\d*,\d*), +(\d*,\d*), +(\d*,\d*)/;

/*
*
TASK CONFIG EXAMPLE
{
	"enabled": true,
	"action": "ssh",
	"description": "ssh uptime",
	"config": {
		"script": "uptime",
		"host": <HOST>,
		"login": <login>,
		"pwd": <pwd>
	}
}
*/

/**
*/
exports.run = function (id, config, ssh, cb, progressLog) {
	ssh.exec('uptime', function(err, stream) {
		var r;
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
				error = new Error('uptime result parse error');
				error.code = 'EPARSEERROR';
				return cb(error);
			}
			result = {
				date: match[1],
				uptime: match[2],
				users: match[3],
				last1MinLoadAverage: match[4],
				last5MinLoadAverage: match[5],
				last15MinLoadAverage: match[6]
			};

			/*" 22:23:50 up  2:45,  2 users,  load average: 0,00, 0,04, 0,08
"
*/
			//progressLog(JSON.stringify(result));
			return cb(undefined, result);
		});
		stream.on('end', function() {
			//progressLog('Stream :: EOF');
		});
		stream.on('close', function() {
			//progressLog('Stream :: close');
		});
		stream.on('exit', function(code, signal) {
			//progressLog('Stream :: exit :: code: ' + code + ', signal: ' + signal);
			ssh.end();
		});
	});
};