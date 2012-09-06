/**
* Copyright ©2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
util = require('util'),
events = require('events');

/**
* @param {Object} config
* @param {Writable Stream} ws. Default to process.stdout
* @param {Function} cb()
*/
function run(config, ws, cb) {
	
	
	ws = ws || process.sdtout;
	var 
	emitter = new events.EventEmitter(),
	session = require('netasqcomm').createSession(config);
	
	emitter.once('returns', cb);
	
	function log(message) {
		ws.write(util.format('%s: %s> %s', new Date().toString(), config.host, message));	
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
	
	session.on('error', function(err) {
			log(util.format('error event: %s(%s)', err.message, err.code));	
			emitter.emit('returns', err);
	});
	
	log(util.format('Connecting...'));	
	session.connect(function(err) {
			if (err) {
				log(util.format('%s(%s)', err.message, err.code));	
				return emitter.emit('returns', err);
			}
			
			log(util.format('Logged in'));	
			
			die();
	});
}

exports.run = run;

