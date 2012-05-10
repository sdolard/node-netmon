var 
// node
spawn = require('child_process').spawn,
os = require('os'),
util = require('util'),
emptyFn = function() {};


/**
* Ping
* @function
*
* @param {object} config
* @param {string} config.host
* @param [{number} config.timeout] max duration of a ping in seconds. Default 2s
* @param [{boolean} config.ipV6]. Default false
*
* @param {function} callback({Error}err, {Object} response) called when ping is finished 
*/
function check(/**{object}*/ config, /**{function}*/ callback) {
	config = config || {};
	config.host = config.host || '';
	debugger;
	config.timeout = config.timeout || 2;
	config.ipV6 = config.ipV6 || false;
	callback = callback || emptyFn;
	
	var
	result = '',
	pingProcess,
	pingBinName,	
	pingArgs = ['-c 1', config.host],
	err; 
	
	if (config.ipV6) {
		pingBinName = 'ping6';
	} else {
		// Args are different for ipV4
		pingBinName = 'ping';
		switch(os.platform()){
		case 'darwin': 
			pingArgs.unshift('-t', config.timeout); // timeout
			break;
		case 'linux': 
			pingArgs.unshift('-w', config.timeout); // timeout
			break;
		default:
			err = new Error('Platform not tested: '+ os.platform());
			err.code = 'EPLATFORMNOTSUPPORTED';
			callback(err);
			return;
		}	
	}
	pingProcess = spawn(pingBinName, pingArgs);
	
	pingProcess.stdout.on('data', function (data) {
			//console.log('stdout: %s', data);
			result = data.toString();
	});
	
	pingProcess.stderr.on('data', function (data) {
			//console.log('stderr: %s', data);
			err = new Error(data.toString());
			err.code = 'EPINGFAILED';
	});
	
	pingProcess.on('exit', function (exitCode) {
			config.exitCode = exitCode;
			if (err === undefined) { // Ping succeed
				config.data = result;
			}
			callback(err, config);		
	});
	
}

exports.check = check;
