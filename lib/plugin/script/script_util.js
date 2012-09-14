/**
* Copyright ©2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
util = require('util'),
events = require('events');

exports.init = function(id, config, ws, session, emitter) {
	function log(message) {
		ws.write(util.format('%s: %s> %s: %s', new Date().toString(), id, config.host, message));	
		if (ws !== process.sdtout) {
			ws.write('\n');
		}
	}
	
	function die(error, result) {
		if (!session.isAuthenticated()) {
			return emitter.emit('returns', error, result);
		}
		session.exec('quit', function(err, response){
				
				var exception = error || err;
				if (err) {
					log('Disconnection failed');
				} else {
					log('Disconnected');				
				}
				
				emitter.emit('returns', exception, result);
		});
	}
	
	return {
		log: log,
		die: die
	};
};

