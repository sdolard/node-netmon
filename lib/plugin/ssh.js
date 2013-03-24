/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
util = require('util'),
events = require('events'),
domain = require('domain'),

// contrib
SSHConnection = require('ssh2');


/**
* @param {Object} config
* @param {Writable Stream} ws. Default to process.stdout
* @param {Function} cb()
*/
function connect(id, config, emitter, progressLog) {

	var
	sshDomain = domain.create(),
	sshconfig = {
		host: config.host,
		port: config.port,
		username: config.login,
		//debug: config.debug ? progressLog : undefined,
		password: config.pwd,
		trykeyboard: true/*,
		hostVerifier: function(foo) {
			progressLog('Connection :: hostVerifier:' + foo);
			return true;
		}*/
	},
	/*if (sshconfig.privateKey) {
		sshconfig.privateKey = config.privateKey;
	}*/
	script,
	ssh = new SSHConnection(),
	error,
	returns;

	ssh.on('connect', function() {
		progressLog('Connected. Authenticating...');
	});

	ssh.on('banner', function(message, language) {
		progressLog(util.format('Banner %s, %s', message, language));
	});

	ssh.on('keyboard-interactive', function(name, instructions, instructionsLang, prompts, finish) {
		progressLog('Keyboard-interactive: ' + name);
		// - The server is asking for replies to the given prompts for keyboard-interactive user authentication.
		// name is generally what you'd use as a window title (for GUI apps).
		// prompts is an array of { prompt: 'Password: ', echo: false }
		// style objects (here echo indicates whether user input should be displayed on the screen).
		// The answers for all prompts must be provided as an array of strings and passed to finish when you are ready to continue.
		// Note: It's possible for the server to come back and ask more questions.
	});


	ssh.on('ready', function() {
		progressLog(util.format('Authenticated. Loading %s/ssh/%s...', __dirname, config.script));

		try {
			script = require(util.format('%s/ssh/%s', __dirname, config.script));
		} catch(e) {
			return emitter.emit('returns', e);
		}
		script.run(id, config, ssh, function(err, ret){
			error = err;
			returns = ret;
		}, progressLog);
	});

	ssh.on('error', function(err) {
		if (config.debug) {
			if (err.level) {
				progressLog('Error level ' + err.level);
			}
			if (err.description) {
				progressLog('Error description ' + err.description);
			}
		}
		error = err;
	});

	ssh.on('end', function() {
		progressLog('Disconnected');
	});

	ssh.on('close', function(had_error) {
		var timeoutError;
		if (error && !error.hasOwnProperty('code')){
			error.code = 'ESSH2';
		}
		if (!error && returns === undefined) {
			timeoutError = new Error('No response(timeout?)');
			timeoutError.code = 'ENORESPONSE';
			emitter.emit('returns', timeoutError);
		} else {
			emitter.emit('returns', error, returns);
		}
	});

	// ssh domain
	sshDomain.on('error', function(e){
		if (!e.hasOwnProperty('code')){
			e.code = 'ESSH2';
		}
		// error.domain The domain that first handled the error.
		//console.log(e.domain);
		// error.domain_emitter The event emitter that emitted an 'error' event with the error object.
		//console.log(e.domain_emitter);
		// error.domain_bound The callback function which was bound to the domain, and passed an error as its first argument.
		//console.log(e.domain_bound);
		// error.domain_thrown A boolean indicating whether the error was thrown, emitted, or passed to a bound callback function.
		//console.log(e.domain_thrown);
		emitter.emit('returns', e, returns);
	});
	sshDomain.run(function(){
		ssh.connect(sshconfig);
	});
}

/**
* @function
* connect to a NETASQ appliance and run script related in config
*
* @param {Object} config an object containing all information needed to check an http connection
* @param {String} config.host the host to connect
* @param {Number} [config.port=443] the port number to use.

* @param {Number} [config.timeout=2] connection timeout in s
*
* @param {Function} callback({Error}err, {Object} response) called when request is done
*/
exports.run = function (id, config, cb, progressLog) {
	id = id || '';
	config = config || {};
	config.host = config.host || '';
	config.port = config.port || 22;
	config.login = config.login || '';
	config.pwd = config.pwd || '';

	cb = cb || function () {};

	var
	err,
	emitter = new events.EventEmitter();

	emitter.once('returns', cb);

	if (!config.script) {
		err = new Error('No script');
		err.code = 'ENSCRIPTNFILENAME';
		return emitter.emit('returns', err);
	}
	connect(id, config, emitter, progressLog);
};

