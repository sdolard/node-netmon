var 
// node
spawn = require('child_process').spawn,
os = require('os'),
util = require('util'),
emptyFn = function() {};


/**
* Ping
* @function
* @param {string} host
* @param [{number} timeout] max duration of a ping in seconds. Default 2
* @param [{boolean} ipV6]. Default false
* @param {function} callback({object}) called when ping is finished 
*/
function check(/** host, timeout, ipV6, callback*/) {
	var
	host = arguments[arguments.length - arguments.length], //jslint warn
	timeout, // s 
	ipV6,
	// check(host, callback)
	callback = arguments[arguments.length - 1];
	
	if (arguments.length == 3) { 
		if (typeof arguments[arguments.length - 2] === 'number') {
			// check(host, timeout, callback)
			timeout = arguments[arguments.length - 2];
			ipV6 = false;
		} else if (typeof arguments[arguments.length - 2] === 'boolean') {
			// check(host, IPV6, callback)
			timeout = 2;
			ipV6 = arguments[arguments.length - 2];
		}
	} else if (arguments.length == 2) {
		timeout = 2;
		ipV6 = false;
	}
	
	var
	result = '',
	p,
	pingBin,	
	pingArgs = ['-c 1', host]; 
	
	if (ipV6) {
		pingBin = 'ping6';
	} else {
		pingBin = 'ping';
		switch(os.platform()){
		case 'darwin': 
			pingArgs.unshift('-t', timeout); // timeout
			break;
		case 'linux': 
			pingArgs.unshift('-w', timeout); // timeout
			break;
		default:
			throw new Error('Platform not tested: '+ os.platform());
		}	
	}
	p = spawn(pingBin, pingArgs);
	
	p.stdout.on('data', function (data) {
			//console.log('stdout: %s', data);
			result = data;
	});
	
	p.stderr.on('data', function (data) {
			//console.log('stderr: %s', data);
			result = data;
	});
	
	p.on('exit', function (exitCode) {
			callback({
					host: host,
					exitCode: exitCode,
					timeout: timeout,
					data: result.toString()
			});		
	});
	
}

exports.check = check;

