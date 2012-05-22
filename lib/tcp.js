var
util = require('util'),
net = require('net'),
emptyFn = function () {};


/**
* check if a port is accessible
* @function
*
* @param Object config an object containing all information needed to check a connection
* @param String config.host the host to connect
* @param Number config.port the port number to use.
* @param Number [config.timeout=2000] connection timeout in ms
*
* @param Function callback({Error}err, {Object} response) called when request is done
*/
function check (/**{object}*/ config, /**{function}*/ callback) {
	config = config || {};
	config.host = config.host || '';
	config.timeout = config.timeout || 2000; // ms
	config.port = config.port || 0;
	config.verbose = config.verbose || false;
	
	callback = callback || emptyFn;
	
	var 
	timeouted = false,
	client = net.connect(config.port, config.host);
	client.on('connect', function () {
			client.end();
			config.date = new Date();
			callback(undefined, config);
	});
	
	
	client.on('error', function (err) {
			// Ensures that no more I/O activity happens on this socket. 
			// Only necessary in case of errors (parse error or so).
			client.destroy();
			
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
	
	
	client.setTimeout(config.timeout, function(){
			config.date = new Date();
			
			timeouted = true;
			var err = new Error('Timeout');
			err.code = 'ETIMEOUT';
			try {
				// When an idle timeout is triggered the socket will receive a 
				// 'timeout' event but the connection will not be severed. 
				// The user must manually end() or destroy() the socket.
				client.destroy();
			} catch (e) {
				console.log('!!!!!! client.destroy() throw an error!');
				console.log(util.inspect(config));
				console.log(e.stack);
			}
			callback(err, config);	
	});
}
exports.check = check;
