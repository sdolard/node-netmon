var
http = require('http');


/**
 * chech if a web server is accesible
 * @param Object options object containing information about the connection
 * @param String options.host the host to connect
 * @param Number [options.port=80] the port number to use. Default 80
 * @param String [options.path='/'] the path to request
 * @param Function callback the function to call when request is down
 * @return false if host is omit
 */
function httpCheck (options) {
	if (!options.host) {
		return false;
	}
	if (!options.port) {
		options.port = 80;
	}
	if (!options.path) {
		options.path = '/';
	}
	// callback is the last arguments.
	callback = arguments[arguments.length -1];

	http.get(options, function (res) {
		callback('sucess. Got status: ' + res.statusCode);
	}).on('error', function (e) {
		callback('failure : ' + e.message);
	});

}
exports.httpCheck = httpCheck;
