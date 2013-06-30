var
Connection = require('ssh2'),
util = require('util'),
events = require('events');

/**
*/
exports.run = function (id, config, ssh, cb, progressLog, commandList) {
	/*jslint unparam: true */
	commandList = commandList.reduce(function(previousValue, currentValue){
		previousValue.push(currentValue);
		previousValue.push('checkresult');
		return previousValue;
	}, []);

	var
	waitforResult = 0,
	previousCommand,
	previousMsg,
	error,
	streamHasExit = false;

	function logIfNewMsg(msg) {
		if (msg === previousMsg) {
			return;
		}
		previousMsg = msg;
		progressLog(msg);
	}
	function onDataStep(step, stream, data, extended){
		data = data.trim();
		if (config.debug) {
			progressLog(data);
		}
		var cmd, cmdResult;
		if (extended === 'stderr') {
			commandList = [];
			error = new Error(data.toString());
			cb(error);
			stream.end();
			return;
		}

		switch (step) {
		case 'onprompt':
			if (commandList.length > 0) {
				cmd = commandList.shift();
				if(cmd === 'checkresult') {
					logIfNewMsg(util.format("> %s > %s...", previousCommand, cmd));
					cmd = 'echo $?';
					waitforResult = 2;
				} else {
					previousCommand = cmd;
					if (!config.debug) {
						logIfNewMsg(util.format("> %s...", cmd));
					}
				}
				stream.write(cmd + '\n');
			} else {
				if (!error) {
					cb(undefined, "done");
				}
				stream.end();
			}
			break;

		case 'onpwdreq':
			logIfNewMsg(util.format("> %s: password required...", previousCommand));
			stream.write(config.pwd + '\r');
			break;

		case 'ondata':
			switch(waitforResult) {
			case 2: // echo written to stdout
				waitforResult--; // TODO: COULD BE NEGATIVE ?
				break;

			case 1: // result
				cmdResult = parseInt(data, 10);
				if (cmdResult !== 0) {
					commandList = [];
					if (!streamHasExit) { // case of reboot or halt
						// TODO: check if we are still connected
						error = new Error(util.format('Command error. "%s" returns %d (data: %s)', previousCommand, cmdResult, data));
						error.code = 'ECOMMANDRETURNS';
						cb(error);
					}

					stream.end();
					return;
				}
				logIfNewMsg(util.format("< %s: succeed%s", previousCommand, streamHasExit ? 'peer close connection' : ''));
				waitforResult--;
				break;

			default:
				if (!config.debug && previousCommand) {
					logIfNewMsg(util.format("< %s...", previousCommand));
				}
			}
			break;

		default:
			commandList = [];
			error = new Error(data.toString());
			error.code = 'ESTEP';
			cb(error);
			stream.end();
			return;
		}
	}

	ssh.shell(function(err, stream) {
		var
		d = '';

		if (err) {
			return cb(err);
		}

		function onStreamData(data, extended) {
			var lines;
			d += data.toString().replace(/\x1b/, '');
			lines = d.split('\n');

			// One line
			if (lines.length === 1) { // no split > no \n
				if (d.substring(d.length-2) === '$ ') {
					onDataStep('onprompt', stream, d, extended);
					d = '';
					return;
				}

				if (d.substring(d.length-2) === ': ' && d.substring(0, 7) === '[sudo] ') {
					onDataStep('onpwdreq', stream, d, extended);
					d = '';
					return;
				}
				return;
			}
			d = '';

			// Multiple lines
			lines.forEach(function(line, index){
				if (index < lines.length - 1) {
					onDataStep('ondata', stream, line, extended);
					return;
				}
				onStreamData(line, extended);
			});
		}

		stream.on('data', onStreamData);
		stream.on('end', function() {
			//progressLog('Stream :: EOF');
			return;
		});
		stream.on('close', function() {
			// progressLog('Stream :: close');
			return;
		});
		stream.on('exit', function(code, signal) {
			/*jslint unparam: true */
			// progressLog('Stream :: exit :: code: ' + code + ', signal: ' + signal);
			streamHasExit = true;
			ssh.end();
		});
	});
};