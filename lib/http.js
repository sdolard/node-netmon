var
util = require('util'),
http = require('http'),
https = require('https'),
emptyFn = function () {};


/**
* check if a web server is accessible
* @param String host the host to connect
* @param Number [port=80|443] the port number to use. Default 80
* @param String [path='/'] the path to request
* @param Number [timeout=2000] connection timeout in ms
* @param Boolean [ssl=false] ssl
* @param Function callback the function to call when request is down
*/
function check (/**{object}*/ config, /**{function}*/ callback) {
	config = config || {};
	config.host = config.host || '';

	config.path = config.path || '/';
	config.timeout = config.timeout || 2000; // ms
	config.ssl = config.ssl || false;
	config.port = config.port || (config.ssl ? 443: 80);
	callback = callback || emptyFn;
	var timeouted = false;
	
	httpF = config.ssl ? https : http;
	request = httpF.get({
			host: config.host,
			port: config.port,
			path: config.path
	}, function (response) {
		//console.log(util.inspect(response));
		config.statusCode = response.statusCode;
		config.statusMessage = http.STATUS_CODES[response.statusCode.toString()];
		var err;
		
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
			if (!timeouted) {
				callback(err,  config);
				return;
			}
			
			if (err.code !== 'ECONNRESET'){
				callback(err,  config);
			}
			// Timeout > we do not forward ECONNRESET error
			
	});
	
	request.setTimeout(config.timeout, function(){
			timeouted = true;
			err = new Error('Timeout');
			err.code = 'ETIMEOUT';
			callback(err, config);	
			request.destroy(); // If we don't do this, socket is still opened. Node bug?
	});
	
}
exports.check = check;

/*check({
		host: 'mail.google.com', 
		ssl: true
}, function (err, r) {
	console.log(util.inspect(err));
	console.log(util.inspect(r));
});*/
