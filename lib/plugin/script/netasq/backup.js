/**
* Copyright ©2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
util = require('util'),
events = require('events'),
SESSION_REQUIRED_LEVEL = ['base', 'maintenance'];

/**
* @param {Object} config
* @param {Writable Stream} ws. Default to process.stdout
* @param {Function} cb()
*/
function run(id, config, ws, cb) {
	ws = ws || process.sdtout;
	config.requiredLevel = config.requiredLevel || SESSION_REQUIRED_LEVEL;
	
	var 
	emitter = new events.EventEmitter(),
	session = require('netasqcomm').createSession(config),
	sutil;
	
	emitter.once('returns', cb);
	
	
	sutil = require('./script_util').init(id, config, ws, session, emitter);
	
	session.on('error', function(err) {
			sutil.log(util.format('error event: %s(%s)', err.message, err.code));	
			emitter.emit('returns', err);
	});
	
	sutil.log(util.format('Connecting (%s)...', session.requiredLevel));	
	session.connect(function(err) {
			if (err) {
				sutil.log(util.format('%s(%s)', err.message, err.code));	
				return emitter.emit('returns', err);
			}
			
			sutil.log(util.format('Logged in (%s)', session.sessionLevel));	
			var 
			now = new Date(),
			fileName = util.format('%s_backup_all_%s-%s-%s.na', 
				session.host,
				("0" + now.getUTCFullYear()).slice(-2),
				("0" + now.getUTCMonth()).slice(-2),
				now.getUTCDate());
			
			sutil.log(util.format('Downloading backup "all"...'));
			
			session.downloadBackup(fileName, 'all', function(err, size, crc){
					if (err) {
						sutil.log(util.format('%s(%s)', err.message, err.code));		
						return sutil.die(err);
					}
					
					sutil.log(util.format('Backup downloaded: %s (size: %s, crc: %s)', fileName, size, crc));	
					
					sutil.die(undefined, {
							fileName: fileName, 
							size: size, 
							crc: crc,
							date: new Date()
					});
			});
	});
}

exports.run = run;

