var 
// node
spawn = require('child_process').spawn,
os = require('os'),
util = require('util'),
emptyFn = function() {},
pingLinuxRe = /.*ttl=(.*) time=(.*) ms/im,
pingDarwinRe = pingLinuxRe,
ping6DarwinRe = /.*hlim=(.*) time=(.*) ms/im,
checkTodo = [],
checkTodoTimeoutPending = false;
/*
Linux
PING localhost (127.0.0.1) 56(84) bytes of data.
64 bytes from localhost (127.0.0.1): icmp_req=1 ttl=64 time=0.024 ms

--- localhost ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 0.024/0.024/0.024/0.000 ms
*/


function delayCheck(config) 
{
	if (config !== undefined) { 
		checkTodo.push(config);
	}
	if (checkTodoTimeoutPending) {
		return;
	}
	checkTodoTimeoutPending = true;
	setTimeout(function(){
			var pingCfg;
			while (checkTodo.length !== 0) {
				pingCfg = checkTodo.shift();
				if (!check(pingCfg.config, pingCfg.callback)) {
					// pingCfg has been readded
					// Timer must be re-run
					console.log("!Out of breath");
					checkTodoTimeoutPending = false;
					delayCheck();
					return;
				}
				//console.log("Running delayed ping. Remains: %d", checkTodo.length);
			}
			
			console.log("No more delayed ping");
			checkTodoTimeoutPending = false;
	}, 1000);
}

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
			err = new Error('Platform not supported: '+ os.platform());
			err.code = 'EPLATFORMNOTSUPPORTED';
			callback(err);
			return;
		}	
	}
	
	try {
		pingProcess = spawn(pingBinName, pingArgs);
	} catch (e) 
	{
		//console.log(util.inspect(e.message, true, 100));
		/*delayCheck({
		config: config,
		callback: callback
		});*/
		config.date = new Date();
		callback(e, config);
		return false;
	}
	
	
	
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
			var errorMessage, errorCode, stat;
			// Now
			config.date = new Date();
			//console.log("%s: %d", config.host, exitCode);
			config.exitCode = exitCode;
			
			if (exitCode === 0) {
				if (err === undefined) { // Ping succeed
					// Raw data
					config.data = result;
					
					switch(os.platform()){
					case 'linux': stat = result.match(pingLinuxRe);
						if (stat !== null) {
							config.ttl = parseInt(stat[1], 10);     
							config.mstime = parseFloat(stat[2]);    
						}
						break;
						
					case 'darwin':
						if (config.ipV6) {
							stat = result.match(ping6DarwinRe);
							if (stat !== null) {
								config.hlim = parseInt(stat[1], 10);     
								config.ttl = config.hlim;
								config.mstime = parseFloat(stat[2]);    
							}
						} else {
							stat = result.match(pingDarwinRe);
							if (stat !== null) {
								config.ttl = parseInt(stat[1], 10);     
								config.mstime = parseFloat(stat[2]);    
							}
						}
						
						break;
						
						
					default:
						err = new Error('Platform not supported: '+ os.platform());
						err.code = 'EPLATFORMNOTSUPPORTED';
					}		
				}	
			} else {
				if (!err) {
					switch(exitCode) {
					case 1: // Linux
					case 2: // Dawrin
						errorCode = 'ENORESPONSE';
						errorMessage = 'the transmission was success-ful but no responses were received.';
						break;
						
					case 64: 
						errorCode = 'EX_USAGE';
						errorMessage = 'The command was used incorrectly.';
						break;
						
					case 65: 
						errorCode = 'EX_DATAERR';
						errorMessage = "The input data was incorrect in some way.";
						break;
						
					case 66:    
						errorCode = 'EX_NOINPUT';
						errorMessage = "An input file (not a system file) did not exist or was not readable.";
						break;
						
					case 67:    
						errorCode = 'EX_NOUSER';
						errorMessage = "The user specified did not exist.";
						break;
						
					case 68:    
						errorCode = 'EX_NOHOST';
						errorMessage = "The host specified did not exist.";
						break;
						
					case 69:    
						errorCode = 'EX_UNAVAILABLE';
						errorMessage = "A service is unavailable.";
						break;
						
					case 70:    
						errorCode = 'EX_SOFTWARE';
						errorMessage = "An internal software error has been detected.";
						break;
						
					case 71:    
						errorCode = 'EX_OSERR';
						errorMessage = "An operating system error has been detected.";
						break;
						
					case 72:    
						errorCode = 'EX_OSFILE';
						errorMessage = "Some system file (e.g., /etc/passwd, /var/run/utmp, etc.) does not exist, cannot be opened, or has some sort of error";
						break;	
						
					case 73:    
						errorCode = 'EX_CANTCREAT';
						errorMessage = "A (user specified) output file cannot be created.";
						break;	
						
					case 74:    
						errorCode = 'EX_IOERR';
						errorMessage = "An error occurred while doing I/O on some file.";
						break;	
						
					case 75:    
						errorCode = 'EX_TEMPFAIL';
						errorMessage = "Temporary failure";
						break;	
						
					case 76:    
						errorCode = 'EX_PROTOCOL';
						errorMessage = "The remote system returned something that was ``not possible'' during a protocol exchange.";
						break;	
						
					case 77:    
						errorCode = 'EX_NOPERM';
						errorMessage = "You did not have sufficient permission to perform the operation";
						break;	
						
					case 78:    
						errorCode = 'EX_CONFIG';
						errorMessage = "Something was found in an unconfigured or misconfigured state.";
						break;	
						
					default:
						console.log('Ping host: %s; exit code: %d', config.host, exitCode);
						errorCode = 'EINVALIDEXITCODE';
						errorMessage = result;
					}
					err = new Error(errorMessage);
					err.code = errorCode;
				}
			}
			callback(err, config);
	});
	return true;
}

exports.check = check;
