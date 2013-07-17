/**
* Copyright ©2012 by Sebastien Dolard (sdolard@gmail.com)
*/

/*jslint node: true, unparam: true */

var
util = require('util'),
events = require('events');

exports.init = function(id, config, progressLog, session, emitter) {
	function die(error, result) {
		if (!session.isAuthenticated()) {
			return emitter.emit('returns', error, result);
		}
		progressLog('Disconnecting...');
		session.exec('quit', function(err, response){

			var exception = error || err;
			if (err) {
				progressLog('Disconnection failed');
			} else {
				progressLog('Disconnected');
			}

			emitter.emit('returns', exception, result);
		});
	}

	return {
		die: die
	};
};

