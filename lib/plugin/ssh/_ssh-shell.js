var
Connection = require('ssh2'),
util = require('util'),
events = require('events');

/**
*/
exports.run = function (id, config, ssh, cb, progressLog, commandList) {

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
			cb(new Error(data.toString()));
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
			d += data.toString().replace('\r', '\n');
			if (data.length === 1 || d.length === 0) {
				return;
			}

			// new line ?
			if (d.charAt(0) === '\n' || d.substring(d.length-1) === '\n') {
				onDataStep('ondata', stream, d, extended);
				d = '';
				return;
			}

			// prompt
			if (d.substring(d.length-2) === '$ ') {
				lines = d.split('\n');
				d = '';
				if (lines.length === 1) {
					onDataStep('onprompt', stream, lines[lines.length-1], extended);
				} else {
					lines.forEach(function(line, index){
						// no \n for last line, it's a prompt
						onStreamData(line + (index < lines.length - 1 ? '\n' : ''), extended);
					});
				}
				return;
			}

			// password required ?
			if (d.substring(d.length-2) === ': ' && d.substring(0, 7) === '[sudo] ') {
				onDataStep('onpwdreq', stream, d, extended);
				d = '';
				return;
			}

			//console.log("stream.on 'data': '%s'; length: %d", data.toString(), data.length);
		}

		stream.on('data', onStreamData);
		stream.on('end', function() {
			//progressLog('Stream :: EOF');
		});
		stream.on('close', function() {
			// progressLog('Stream :: close');
		});
		stream.on('exit', function(code, signal) {
			// progressLog('Stream :: exit :: code: ' + code + ', signal: ' + signal);
			streamHasExit = true;
			ssh.end();
		});
	});
};