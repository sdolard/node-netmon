/**
* Copyright ©2012 by Sebastien Dolard (sdolard@gmail.com)
*/                                                          

var
util = require('util'),
events = require('events'),
SESSION_REQUIRED_LEVEL = ['base'];

/**
* @param {Object} config
* @param {Writable Stream} ws. Default to process.stdout
* @param {Function} cb()
*/
function run(id, config, cb, log) {
	config.requiredLevel = config.requiredLevel || SESSION_REQUIRED_LEVEL;
	
	var 
	emitter = new events.EventEmitter(),
	session = require('netasqcomm').createSession(config),
	sutil;
	
	emitter.once('returns', cb);
	
	sutil = require('./script_util').init(id, config, log, session, emitter);
	
	session.on('error', function(err) {
			log(util.format('error event: %s(%s)', err.message, err.code));	
			emitter.emit('returns', err);
	});
	
	log(util.format('Connecting (%s)...', session.requiredLevel));	
	session.connect(function(err) {
			if (err) {
				log(util.format('%s(%s)', err.message, err.code));	
				return emitter.emit('returns', err);
			}
			
			log(util.format('Logged in (%s)', session.sessionLevel));	
			
			sutil.die(undefined, 'successfully logged');
	});
}

exports.run = run;

