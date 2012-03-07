var
http = require('http');


/**
 * chech if a web server is accesible
 * @param String host the host to connect
 * @param Number [port=80] the port number to use. Default 80
 * @param String [path='/'] the path to request
 * @param Function callback the function to call when request is down
 * @return false if host is omit
 */
function httpCheck (host, port, path, callback) {
	var options = {
		port: 80,
		path: '/'
	};
	if (!host) {
		return false;
	}
	if (port) {
		options.port = port;
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
