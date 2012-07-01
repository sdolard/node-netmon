/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
util = require('util');

/**
* @param {Object} config
* @param {Writable Stream} ws. Default to process.stdout
* @param {Function} cb()
*/
function run(config, ws, cb) {
	
	ws = ws || process.sdtout;
	var 
	cbCall = 0, // cb must be called once (use eventEmitter?)
	session = require('netasqcomm').createSession(config);
	
	function log(message) {
		ws.write(util.format('%s: %s> %s', new Date().toString(), config.host, message));	
		if (ws !== process.sdtout) {
			ws.write('\r\n');
		}
	}
	
	session.on('error', function(err) {
			log(util.format('%s(%s)', err.message, err.code));	
			if(cbCall === 0) { 
				cb(err);
				cbCall++;
			}
	});
	
	session.on('connected', function() {
			log(util.format('Logged in'));	
			var 
			now = new Date(),
			fileName = util.format('%s_backup_all_%d-%d-%d.na', 
				session.host,
				now.getUTCFullYear(),
				now.getUTCMonth(),
				now.getUTCDate());
			
			log(util.format('Downloading backup "all"...'));
			
			session.downloadBackup(fileName, 'all', function(err, size, crc){
					if (err) {
						log(util.format('%s(%s)', err.message, err.code));	
						if(cbCall === 0) {
							cb(err);
							cbCall++;
						}
					} else {
						log(util.format('Backup downloaded: %s (size: %s, crc: %s)', fileName, size, crc));	
					}
					session.exec('quit', function(response){
							log('Disconnected');	
							if(cbCall === 0) {
								cb(undefined, {
										fileName: fileName, 
										size: size, 
										crc: crc,
										date: new Date()
								});
								cbCall++;
							}
					});
			});
	});
	log(util.format('Connecting...'));	
	session.connect();
}

exports.run = run;

