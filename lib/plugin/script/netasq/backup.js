/**
* Copyright ©2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
util = require('util'),
path = require('path'),
events = require('events'),
SESSION_REQUIRED_LEVEL = ['base', 'maintenance'];

/*
TASK CONFIG EXAMPLE
{
	"enabled": true,
	"action": "script",
	"description": "netasq backup all",
	"config": {
		"script": "netasq/backup",
		"outdir": <outdir>, // default to cwd
		"host": <host>,
		"login": <login>,
		"pwd": <pwd>
	}
}
*/

/**
* @param {Object} config
* @param {Writable Stream} ws. Default to process.stdout
* @param {Function} cb()
*/
function run(id, config, cb, progressLog) {
	config.requiredLevel = config.requiredLevel || SESSION_REQUIRED_LEVEL;

	var
	emitter = new events.EventEmitter(),
	session = require('netasqcomm').createSession(config),
	sutil;

	emitter.once('returns', cb);

	sutil = require('./script_util').init(id, config, progressLog, session, emitter);

	session.on('error', function(err) {
			progressLog(util.format('error event: %s(%s)', err.message, err.code));
			emitter.emit('returns', err);
	});

	progressLog(util.format('Connecting (%s)...', session.requiredLevel));
	session.connect(function(err) {
			if (err) {
				progressLog(util.format('%s(%s)', err.message, err.code));
				return emitter.emit('returns', err);
			}

			progressLog(util.format('Logged in (%s)', session.sessionLevel));
			var
			now = new Date(),
			outdir = config.outdir || process.cwd(),
			fileName = path.join(outdir, util.format('%s_backup_all_%s-%s-%s.na',
				session.host,
				("0" + now.getUTCFullYear()).slice(-2),
				("0" + now.getUTCMonth()).slice(-2),
				("0" + now.getUTCDate()).slice(-2))
			);

			progressLog(util.format('Downloading backup "all"...'));

			session.downloadBackup(fileName, 'all', function(err, size, crc){
					if (err) {
						progressLog(util.format('%s(%s)', err.message, err.code));
						return sutil.die(err);
					}

					progressLog(util.format('Backup downloaded: %s (size: %s, crc: %s)', fileName, size, crc));

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

