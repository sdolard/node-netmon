var
Connection = require('ssh2'),
util = require('util'),
events = require('events');

/**
*/
exports.run = function (id, config, ssh, cb, progressLog) {
	ssh.exec('uptime', function(err, stream) {
		var r;
		if (err) {
			return cb(err);
		}
		stream.on('data', function(data, extended) {
			if (extended === 'stderr') {
				return cb(new Error(data.toString()));
			}
			// TODO: create an object for this
			/*" 22:23:50 up  2:45,  2 users,  load average: 0,00, 0,04, 0,08
"
*/
			return cb(undefined, data.toString());
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