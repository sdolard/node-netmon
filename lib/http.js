var
util = require('util'),
http = require('http'),
https = require('https'),
emptyFn = function () {};


/**
* check if a web server is accessible
* @function
*
* @param Object config an object containing all information needed to check an http connection
* @param String config.host the host to connect
* @param Number [config.port=80|443] the port number to use.
* @param String [config.path='/'] the path to request
* @param Number [config.timeout=2000] connection timeout in ms
* @param Boolean [config.ssl=false] ssl
*
* @param Function callback({Error}err, {Object} response) called when request is done
*/
function check (/**{object}*/ config, /**{function}*/ callback) {
	debugger;
	config = config || {};
	config.host = config.host || '';
	config.path = config.path || '/';
	config.timeout = config.timeout || 2000; // ms
	config.ssl = config.ssl || false;
	config.port = config.port || (config.ssl ? 443: 80);
	callback = callback || emptyFn;
	
	var 
	timeouted = false,
	err,
	httpF = config.ssl ? https : http,
	request;
	if (config.host === '') {
		err = new Error('No host defined');
		err.code = 'ENOHOST';
		return callback(err, config);
	}
	
	request = httpF.get({
			host: config.host,
			port: config.port,
			path: config.path,
			agent: false
	}, function (response) {
		//console.log(util.inspect(response));
		config.date = new Date();
		config.statusCode = response.statusCode;
		config.statusMessage = http.STATUS_CODES[response.statusCode.toString()];
		
		switch(response.statusCode.toString().charAt(0)) {
		case '1': // Informational
		case '2': // Success
		case '3': // Redirection
			callback(undefined, config);
			break;
			
		case '4': // Client Error
		case '5': // Server Error
			err = new Error('Unexpected status code');
			err.code = 'EUNEXPECTEDSTATUSCODE';
			callback(err, config);
			break;
			
		default:
			err = new Error('Unexpected status code');
			err.code = 'EUNEXPECTEDSTATUSCODE';
			callback(err, config);
		}
	});
	
	
	request.on('error', function (err) {
			// Ensures that no more I/O activity happens on this socket. 
			// Only necessary in case of errors (parse error or so).
			request.destroy();
			
			config.date = new Date();
			
			if (!timeouted) {
				callback(err,  config);
				return;
			}
			
			// Timeout > we do not forward ECONNRESET error
			if (err.code !== 'ECONNRESET'){
				callback(err,  config);
			}
	});
	
	request.on('socket', function (socket) {
			socket.setMaxListeners(0);
	});
	
	
	
	request.setTimeout(config.timeout, function(){
			config.date = new Date();
			
			timeouted = true;
			err = new Error('Timeout');
			err.code = 'ETIMEOUT';
			try {
				// When an idle timeout is triggered the socket will receive a 
				// 'timeout' event but the connection will not be severed. 
				// The user must manually end() or destroy() the socket.
				request.destroy(); // If we don't do this, socket is still opened. Node bug?
			} catch (e) {
				console.log('!!!!!! request.destroy() throw an error!');
				console.log(util.inspect(config));
				console.log(e.stack);
			}
			callback(err, config);	
	});
}
exports.check = check;
