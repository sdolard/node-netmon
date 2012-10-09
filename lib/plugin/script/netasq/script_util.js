/**
* Copyright ©2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
util = require('util'),
events = require('events');

exports.init = function(id, config, log, session, emitter) {
	function die(error, result) {
		if (!session.isAuthenticated()) {
			return emitter.emit('returns', error, result);
		}
		log('Disconnecting...');
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

