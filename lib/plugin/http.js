/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
util = require('util'),
http = require('http'),
https = require('https'),
events = require('events'),
emptyFn = function () {};

function sanitizeHttpResponse(response){
	return {
		date: response.date, // not on original http response
		statusMessage: response.statusMessage,// not on original http response
		httpVersion: response.httpVersion,
		statusCode: response.statusCode,
		headers: response.headers
	};
}

/**
* check if a web server is accessible
* @function
*
* @param Object config an object containing all information needed to check an http connection
* @param String config.host the host to connect
* @param Number [config.port=80|443] the port number to use.
* @param String [config.path='/'] the path to request
* @param Number [config.timeout=2] connection timeout in s
* @param Boolean [config.ssl=false] ssl
*
* @param Function callback({Error}err, {Object} config, {Object} response) called when request is done
*/
function check (id, config, callback, log) {
	id = id || '';
	config = config || {};
	config.host = config.host || '';
	config.path = config.path || '/';
	config.timeout = config.timeout || 2; // s
	config.ssl = config.ssl || false;
	config.port = config.port || (config.ssl ? 443: 80);
	callback = callback || emptyFn;
	
	var 
	timeouted = false,
	err,
	httpF = config.ssl ? https : http,
	request,
	emitter = new events.EventEmitter();
	
	emitter.once('returns', callback);
	
	if (config.host === '') {
		err = new Error('No host defined');
		err.code = 'ENOHOST';
		return emitter.emit('returns', err, config);
	}
	
	log(util.format('Trying to connect to http%s://%s:%d/%s', config.ssl ? 's' : '', config.host, config.port, config.path));
	request = httpF.get({
			host: config.host,
			port: config.port,
			path: config.path,
			agent: false
	}, function (response) {
		//console.log(util.inspect(response));
		response.date = new Date();
		//response.statusCode = response.statusCode;
		response.statusMessage = http.STATUS_CODES[response.statusCode.toString()];
		
		log(util.format('Connected to http%s://%s:%d%s: %s', config.ssl ? 's' : '', config.host, config.port, config.path, response.statusMessage));
		
		switch(response.statusCode.toString().charAt(0)) {
		case '1': // Informational
		case '2': // Success
		case '3': // Redirection
			emitter.emit('returns', undefined, config, sanitizeHttpResponse(response));
			break;
			
		case '4': // Client Error
		case '5': // Server Error
			err = new Error('Unexpected status code');
			err.code = 'EUNEXPECTEDSTATUSCODE';
			emitter.emit('returns', err, config, sanitizeHttpResponse(response));
			break;
			
		default:
			err = new Error('Unexpected status code');
			err.code = 'EUNEXPECTEDSTATUSCODE';
			emitter.emit('returns', err, config, sanitizeHttpResponse(response));
		}
	});
	
	
	request.on('error', function (err) {			
			// Ensures that no more I/O activity happens on this socket. 
			// Only necessary in case of errors (parse error or so).
			request.destroy();
			
			if (!timeouted) {
				emitter.emit('returns', err, config);
				return;
			}
			
			// Timeout > we do not forward ECONNRESET error
			if (err.code !== 'ECONNRESET'){
				emitter.emit('returns', err,  config);
			}
	});
	
	request.on('socket', function (socket) {
			socket.setMaxListeners(0);
	});
	
	request.setTimeout(config.timeout * 1000, function(){
			timeouted = true;
			err = new Error('Timeout');
			err.code = 'ETIMEOUT';
			try {
				// When an idle timeout is triggered the socket will receive a 
				// 'timeout' event but the connection will not be severed. 
				// The user must manually end() or destroy() the socket.
				request.destroy(); // If we don't do this, socket is still opened. Node bug?
			} catch (e) {
				console.log(id + '> ' + '!!!!!! request.destroy() throw an error!');
				console.log(id + '> ' + util.inspect(config));
				console.log(id + '> ' + e.stack);
			}
			emitter.emit('returns', err, config);	
	});
}
exports.run = check;
