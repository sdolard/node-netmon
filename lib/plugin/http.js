/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
util = require('util'),
http = require('http'),
https = require('https'),
events = require('events'),
emptyFn = function () {},
RE_LOCATION_HOST= /(^http[s]?:\/\/)?([\w.]+)(:\d+)?.*$/i;

function sanitizeHttpResponse(response){
	var 
	location,
	capture,
	data = {
		date: new Date(),// not on original http response
		statusCode: response.statusCode,
		statusMessage: http.STATUS_CODES[response.statusCode],// not on original http response
		httpVersion: response.httpVersion,
		headers: response.headers
	};
	
	// locationHost
	// TODO: for all 3** statusCode ?
	if (response.statusCode === 302) { // redirection
		location = response.headers.location;
		capture = location.match(RE_LOCATION_HOST);
		if (capture && capture[2]) {
			data.locationHost = capture[2];
		}
	}
	return data;
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
	config.timeout = config.timeout || 1; // s
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
	
	log('Connecting...');
	request = httpF.get({
			host: config.host,
			port: config.port,
			path: config.path,
			agent: false
	}, function (response) {
		var sanResponse = sanitizeHttpResponse(response);
		
		log(util.format('Connected: %s', sanResponse.statusMessage));
		
	
		switch(response.statusCode.toString().charAt(0)) {
		case '1': // Informational
		case '2': // Success
			emitter.emit('returns', undefined, config, sanResponse);
			break;
			
		case '3': // Redirection
			if (sanResponse.locationHost && sanResponse.locationHost !== config.host) {
				// if it's a redirection to another host, 
				// we consider it has a failure because anwser is probably done by a proxy
				err = new Error(util.format('Location host (%s) is different from host (%s)',
					sanResponse.locationHost, config.host));
				err.code = 'ELOCATIONHOST';
				emitter.emit('returns', err, config, sanResponse);
			}else {
				emitter.emit('returns', undefined, config, sanResponse);
			}
			break;
			
		case '4': // Client Error
		case '5': // Server Error
			err = new Error(sanResponse.statusMessage);
			err.code = 'EUNEXPECTEDSTATUSCODE';
			emitter.emit('returns', err, config, sanResponse);
			break;
			
		default:
			err = new Error(sanResponse.statusMessage);
			err.code = 'EUNEXPECTEDSTATUSCODE';
			emitter.emit('returns', err, config, sanResponse);
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
				log('!!!!!! request.destroy() throw an error!');
				log(util.inspect(config));
				log(e.stack);
			}
			emitter.emit('returns', err, config);	
	});
}
exports.run = check;
