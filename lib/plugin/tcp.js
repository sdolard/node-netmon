/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/


var
util = require('util'),
net = require('net'),
events = require('events'),
emptyFn = function () {};


/**
* check if a port is accessible
* @function
*
* @param {Object} config an object containing all information needed to check a connection
* @param {String} config.host the host to connect
* @param {Number} config.port the port number to use.
* @param {Number} [config.timeout=2] connection timeout in s
*
* @param {Function} callback({Error}err, {Object} response) called when request is done
*/
function check (id, config, callback, log) {
	id = id || '';
	config = config || {};
	config.host = config.host || '';
	config.timeout = config.timeout || 1; // s
	config.port = config.port || 0;
	config.verbose = config.verbose || false;
	
	
	callback = callback || emptyFn;
	
	var 
	start = Date.now(),
	timeouted = false,
	err,
	client,
	emitter = new events.EventEmitter();
	
	emitter.once('returns', callback);
	
	if (config.host === '') {
		err = new Error('No host defined');
		err.code = 'ENOHOST';
		return emitter.emit('returns', err, config);
	}
	if (config.port === 0) {
		err = new Error('No port defined');
		err.code = 'ENOPORT';
		return emitter.emit('returns', err, config);
	}
	log('Connecting...');
	client = net.connect(config.port, config.host);
	client.on('connect', function () {
			log('Connected');
			client.end();
			emitter.emit('returns', undefined, config, {
					date: new Date()
			});
	});
	
	
	client.on('error', function (err) {
			// Ensures that no more I/O activity happens on this socket. 
			// Only necessary in case of errors (parse error or so).
			client.destroy();
			
			if (!timeouted) {
				emitter.emit('returns', err,  config);
				return;
			}
			
			// Timeout > we do not forward ECONNRESET error
			if (err.code !== 'ECONNRESET'){
				emitter.emit('returns', err,  config);
			}
	});
	
	
	client.setTimeout(config.timeout * 1000, function(){
			timeouted = true;
			var err = new Error('Timeout');
			err.code = 'ETIMEOUT';
			try {
				// When an idle timeout is triggered the socket will receive a 
				// 'timeout' event but the connection will not be severed. 
				// The user must manually end() or destroy() the socket.
				client.destroy();
			} catch (e) {
				log('!!!!!! client.destroy() throw an error!');
				log(util.inspect(config));
				log(e.stack);
			}
			emitter.emit('returns', err, config);	
	});
}
exports.run = check;
