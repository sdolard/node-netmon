/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var 
//node
util = require('util'),
fs = require('fs'),

// contrib
getopt = require('posix-getopt'), 
colors = require('colors'), 

// lib
netjob_manager = require('../lib/netjob_manager'),


NetmonApp = (function(){
		var INTERVAL_DEFAULT_VALUE = 1000;
		
		function NetmonApp() {
			// global var
			this.configFile = __dirname + "/../bin/config.default.json";
			this.quiet = false;
			this.push_interval = INTERVAL_DEFAULT_VALUE; // default value in ms
			this.push_interval_id = -1;

			this.jobManager = netjob_manager.create();
			this.jobManager.on('taskstart', this._onTaskStart.bind(this));
			this.jobManager.on('taskprogress', this._onTaskProgress.bind(this));
			this.jobManager.on('taskresult', this._onTaskResult.bind(this));
			this.jobManager.on('jobdone', this._onJobDone.bind(this));
			this.jobManager.on('jobabort', this._onJobAbort.bind(this));
			this.jobManager.on('error', this._onJobManagerError.bind(this));

			this.output_json_file_name = undefined;
			this.port = undefined;
			this.io = undefined;
			this.sigintCount = 0;

			this.getProcessArgs();	
			this.loadConfig();
			this.initProcessSignals();
		}
		
		
		/**
		* Display help
		*/
		NetmonApp.prototype.displayHelp = function() {
			console.log('netmon [-c config_file] [-o output_json_file] [-p port] [-i interval] [-q] [-h] ');
			console.log('netmon: A network job engine.');
			console.log('Options:');
			console.log('  c: json config file');
			console.log('  q: quiet. Do not display anything to console');	
			console.log('  p: port. Send result to specified port. Socket io event: \'update\'');
			console.log('  o: output json file');
			console.log('  i: millisecond interval to write to output_json_file/to emit via socketio. Default 1000ms.');
			console.log('  h: display this help');
		};
		
		/*
		*
		*/
		NetmonApp.prototype.initSocketIo = function() {
			if (this.port === undefined) {
				return;
			}
			// note, io.listen(<port>) will create a http server for you
			this.io = require('socket.io').listen(this.port);
			this.io.set('log level', 1);
		};
		
		
		// Log
		NetmonApp.prototype.log = function() {
			if (this.quiet) {
				return;
			}
			console.log.apply(console, arguments);
		};
		
		// Error log
		NetmonApp.prototype.error = function() {
			if (this.quiet) {
				return;
			}
			console.error.apply(console, arguments);
		};
		
		NetmonApp.prototype.getProcessArgs = function(){
			var 
			optParser, opt;
			
			// Command line options
			optParser = new getopt.BasicParser(':hqc:o:p:i:', process.argv);
			while ((opt = optParser.getopt()) !== undefined && !opt.error) {
				switch(opt.option) {
				case 'c': 
					this.configFile = opt.optarg;
					break;
					
				case 'o': 
					this.output_json_file_name = opt.optarg;
					break;
					
				case 'h': // help
					this.displayHelp();
					process.exit();
					break;
					
				case 'q': // quiet
					this.quiet = true;
					break;
					
				case 'p': // port
					this.port = parseInt(opt.optarg, 10);
					break;
					
				case 'i': // interval
					this.push_interval = parseInt(opt.optarg, 10);
					break;
					
				default:
					this.error('Invalid or incomplete option');
					this.displayHelp();
					process.exit(1);	
				}
			}
			
			// Current config file
			this.log('Reading configuration from: %s', this.configFile);
			
			// output file
			if (this.output_json_file_name) {
				this.log('Result will be written in: %s', this.output_json_file_name);
			}
			// socket.io
			this.initSocketIo();

			// push_interval
			if (this.push_interval !== INTERVAL_DEFAULT_VALUE) {
				this.log('Push interval default value changed: %dms (default %dms)', 
					this.push_interval, INTERVAL_DEFAULT_VALUE);
			}
		};
		
		
		/*
		* Write data to file or/and to socket
		*/
		NetmonApp.prototype.writeResult = function() {
			this.writeToFile();
			this.writeToSocket();
		};
		
		/*
		* Write data to file if enabled
		*/
		NetmonApp.prototype.writeToFile = function() {
			var 
			me = this;
			if (this.output_json_file_name === undefined) {
				return;
			}
			fs.writeFile(this.output_json_file_name, util.format('%j', {
					script: this.configFile,
					jobs: this.jobs
			}), function (err) {
				if (err) {
					me.error(err);
				}
			});
		};
		
		/*
		* Write data to socket if enabled
		*/
		NetmonApp.prototype.writeToSocket = function() {
			if (this.port === undefined) {
				return;
			}
			this.io.sockets.emit('update', util.format('%j', {
					script: this.configFile,
					jobs: this.jobs
			}));
		};
		
		NetmonApp.prototype.disonnectSocketIo = function() {
			if (!this.io) {
				return;
			}
			this.io.sockets.emit('disconnect');
			this.io.server.close();
		};
		

		NetmonApp.prototype.loadConfig = function() {

			this.jobManager.load(this.configFile, function(err, config){
					if (err) {
						this.error(err);
						process.exit(1);
						return;
					}
					
					if (this.jobManager.jobCount() === 0) {
						this.error('No job. Aborting.'.red);
						process.exit(1);
						return;
					} 
					// Init
					this.writeResult();
					
					// Write result to file each second 
					if (this.output_json_file_name || this.port > 0) {
						this.push_interval_id = setInterval(this.writeResult.bind(this), this.push_interval);
					}
			}.bind(this));	
		};
		
		NetmonApp.prototype.initProcessSignals = function() {
			process.on('exit', this.onProcessExit.bind(this));
			process.on('SIGINT', this.onProcessSigint.bind(this));
		};
		
		
		NetmonApp.prototype.onProcessExit = function() {
			//?
		};
		
		NetmonApp.prototype.onProcessSigint = function() {
			if (this.sigintCount >= 1) {
				process.exit();
			} else {
				this.log('Aborting jobs... Press CTRL+C again to force\n');
				this.jobManager.abort();
			}
			this.sigintCount++;
		};
		
		NetmonApp.prototype._onTaskStart = function(config, task, job) {
			var msg;
			if (task.action === 'script') {
				msg = util.format('%s (%s:%s): script \'%s\' on %s starting', 
					new Date().toISOString(),
					task.id, 
					task.state,
					task.config.script, 
					task.config.host);
			} else {
				msg = util.format('%s (%s:%s): %s on %s starting', 
					new Date().toISOString(), 
					task.id, 
					task.state,
					task.action, 
					task.config.host);
			}
			// TODO: use ANSI package
			// TODO: log should re emit _onTaskStart a log message, not write to console
			this.log(msg);
		};

		NetmonApp.prototype._onTaskProgress = function(config, task, message, job) {
			var msg;
			if (task.action === 'script') {
				msg = util.format('%s (%s:%s): script \'%s\' on %s: %s', 
					message.date.toISOString(), 
					task.id, 
					task.state,
					task.config.script,            
					task.config.host, 
					message.msg);
			} else {
				msg = util.format('%s (%s:%s): %s on %s: %s', 
					message.date.toISOString(), 
					task.id, 
					task.state,
					task.action, 
					task.config.host, 
					message.msg);
			}
			
			this.log(msg);	
		};
		
		NetmonApp.prototype._onTaskResult = function(err, config, response, task, job) {
			var msg;
			if (task.action === 'script') {
				msg = util.format('%s (%s:%s): script \'%s\' on %s %s', 
					response ? response.date.toISOString(): new Date().toISOString(), 
					task.id, 
					task.state,
					task.config.script, 
					task.config.host, 
					err === undefined ? 'succeed': 'failed');
			} else {
				msg = util.format('%s (%s:%s): %s on %s %s', 
					response ? response.date.toISOString(): new Date().toISOString(), 
					task.id, 
					task.state,
					task.action, 
					task.config.host, 
					err === undefined ? 'succeed': 'failed');
			}
			
			if (err) {
				msg = util.format('%s (%s: %s)', msg, err.code, err.message);
				this.error(msg.red);
			} else {
				this.log(msg.green);	
			}
		};
		
		NetmonApp.prototype._onJobDone = function(job) {
			if (job.isTerminated()) {
				this.log('JOB TERMINATED: id %s'.white, job.id);
			} else {
				this.log('JOB DONE: id %s'.white, job.id);
			} 
			this._stopIf();
		};
		
		NetmonApp.prototype._onJobAbort = function(job) {
			this.log('JOB ABORTED: id %s'.white, job.id);
		};

		NetmonApp.prototype._onJobManagerError = function(err) {
			var 
			msg = util.format('%s: %s %s', new Date().toISOString(), err.code, err.message);
			this.error(msg.red);
		};

		/*
		* Stop  push_interval_id timer, close socketio
		* If all jobs are terminated
		*/
		NetmonApp.prototype._stopIf = function() {
			if (!this.jobManager.jobsAreTerminated()) {
				return;
			}

			this.log('JOBS TERMINATED.'.white);
			if (this.push_interval_id !== -1) {
				clearInterval(this.push_interval_id);
				this.push_interval_id = -1;
			}
			this.writeResult();
			this.disonnectSocketIo();
			this.log('Please wait. Halting...'.white);
		};


		return NetmonApp;
}()),

app = new NetmonApp(); 


/*
process.on('uncaughtException', function (err) {
console.log('Caught exception: ' + err);
process.exit(1);
});
*/


