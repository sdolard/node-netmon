var
Connection = require('ssh2'),
util = require('util'),
events = require('events');

/*
TASK CONFIG EXAMPLE
{
	"enabled": true,
	"action": "ssh",
	"description": "ubuntu-upgrade",
	"config": {
		"script": "ubuntu-upgrade",
		"host": <HOST>,
		"login": <login>,
		"pwd": <pwd>
	}
}
*/
/**
*/
exports.run = function (id, config, ssh, cb, progressLog) {

	var PROMPT_IN = [
		'sudo apt-get update', 'checkresult',
		'sudo apt-get upgrade -y', 'checkresult'
		//'sudo reboot', 'checkresult'
		//'sudo apt-get install vlc -y', 'checkresult'
	],
	waitforResult = 0,
	previousCommand;

	function onDataStep(step, stream, data, extended){
		data = data.trim();
		var error, cmd, cmdResult;
		if (extended === 'stderr') {
			cb(new Error(data.toString()));
			stream.end();
			return;
		}

		switch (step) {
		case 'onprompt':
			progressLog(data);
			if (PROMPT_IN.length > 0) {
				cmd = PROMPT_IN.shift();
				if(cmd === 'checkresult') {
					cmd = 'echo $?';
					waitforResult = 2;
				} else {
					previousCommand = cmd;
				}
				stream.write(cmd + '\n');
			} else {
				stream.end();
			}
			break;

		case 'onpwdreq':
			progressLog(data);
			stream.write(config.pwd + '\r');
			break;

		case 'ondata':
			switch(waitforResult) {
			case 2: // echo written to stdout
				progressLog(data);
				waitforResult--;
				break;
			case 1: // result
				cmdResult = parseInt(data, 10);
				progressLog(data);
				if (cmdResult !== 0) {
					error = new Error(util.format('Command error. "%s" returns %d', previousCommand, cmdResult));
					error.code = 'ECOMMANDRETURNS';
					cb(error);
					PROMPT_IN = [];
					stream.end();
					return;
				}
				waitforResult--;
				break;
			default:
				progressLog(data);
			}
			break;

		default:
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
					lines.forEach(function(line){
						onStreamData(line + '\n', extended);
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
			//progressLog('Stream :: close');
		});
		stream.on('exit', function(code, signal) {
			//progressLog('Stream :: exit :: code: ' + code + ', signal: ' + signal);
			ssh.end();
		});
	});
};