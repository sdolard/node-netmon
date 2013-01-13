/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/


var 
vows = require('vows'),
assert = require('assert'),
util = require('util'),
events = require("events"),
nettasq = require('../lib/nettask'),
TASK_RESULT_RECEIVED = false,
TASK2_START_RECEIVED = false,
TASK2_RESULT_RECEIVED = false;

exports.suite1 = vows.describe('nettask').addBatch({
		'When create a empty task': {
			topic: function() {
				var
				promise = new events.EventEmitter(),
				invalidPingTask = nettasq.create();
				
				invalidPingTask.on('taskresult', function (err, config, response, task) {
						if (err) { 
							promise.emit('success', err); 
						}
				});
				invalidPingTask.run();
				return promise;
			},
			'It failed': function (err) {
				assert.isNotNull(err);
			},
			'Error code equal EINVALIDACTION': function (err) {
				assert.strictEqual(err.code, 'EINVALIDACTION');
			},
			'Error message equal "action is undefined"': function (err) {
				assert.strictEqual(err.message, 'action is undefined');
			}
		},
		'When create a ping task with no config': {
			topic: function() {
				var
				promise = new events.EventEmitter(),
				invalidPingTask = nettasq.create({            
						action: 'ping'
				});
				
				invalidPingTask.on('taskresult', function (err, config, response, task) {
						if (err) { 
							promise.emit('success', err); 
						}
				});
				invalidPingTask.run();
				return promise;
			},
			'It failed': function (err) {
				assert.isNotNull(err);
			},
			'Error code equal ENOHOST': function (err) {
				assert.strictEqual(err.code, 'ENOHOST');
			},
			'Error message is valid': function (err) {
				assert.strictEqual(err.message, 'No host defined');
			}
		},  
		'When create a ping task with no config.host': {
			topic: function() {
				var
				promise = new events.EventEmitter(),
				invalidPingTask = nettasq.create({
						action: 'ping',
						config: {}
				});
				
				invalidPingTask.on('taskresult', function (err, config, response, task) {
						if (err) { 
							promise.emit('success', err); 
						}
				});
				invalidPingTask.run();
				return promise;
			},
			'It failed': function (err) {
				assert.isNotNull(err);
			},
			'Error code equal ENOHOST': function (err) {
				assert.strictEqual(err.code, 'ENOHOST');
			},
			'Error message is valid': function (err) {
				assert.strictEqual(err.message, 'No host defined');
			}
		},
		'When create a valid ping action task on localhost': {
			topic: function() {
				var
				promise = new events.EventEmitter(),
				pingTask = nettasq.create({
						action: 'ping',
						config: {
							host: 'localhost'
						}
				});
				
				pingTask.on('taskresult', function (err, config, response, task) {
						if (err) { 
							promise.emit('error', err); 
						} else { 
							promise.emit('success', config, response, task); 
						}
				});
				pingTask.run();
				return promise;
			},
			'It succeed': function (err, config, response, task) {
				assert.strictEqual(response.exitCode, 0);
			},
			'host is set to localhost': function (err, config, response, task) {
				assert.strictEqual(config.host, 'localhost');
			},
			'default timeout equals 1': function (err, config, response, task) {
				assert.strictEqual(config.timeout, 1);
			},
			
			'ipv6 is disabled by default': function (err, config, response, task) {
				assert.isFalse(config.ipV6);
			},
			'date is set': function (err, config, response, task) {
				assert.isTrue(response.date !== undefined);
			},
			'data is a string': function (err, config, response, task) {
				assert.isString(response.data);
			}
		},
		'When a valid ping action task on localhost is finished': {
			topic: function() {
				var
				promise = new events.EventEmitter(),
				pingTask = nettasq.create({
						action: 'ping',
						config: {
							host: 'localhost'
						}
				});
				
				pingTask.on('done', function (task) {
						promise.emit('success', task); 
				});
				pingTask.run();
				return promise;
			},
			'"done" event is called': function (err, task) {
				assert.isNull(err);
				assert.equal(task.state, 'done');
			}
		},/********************************************************************/
		'When create a http task with no config': {
			topic: function() {
				var
				promise = new events.EventEmitter(),
				invalidTask = nettasq.create({
						action: 'http'
				});
				
				invalidTask.on('taskresult', function (err, config, response, task) {
						if (err) { 
							promise.emit('success', err); 
						}
				});
				invalidTask.run();
				return promise;
			},
			'It failed': function (err) {
				assert.isNotNull(err);
			},
			'Error code equal ENOHOST': function (err) {
				assert.strictEqual(err.code, 'ENOHOST');
			},
			'Error message is valid': function (err) {
				assert.strictEqual(err.message, 'No host defined');
			}
		},  
		'When create a http task with no config.host': {
			topic: function() {
				var
				promise = new events.EventEmitter(),
				invalidTask = nettasq.create({
						action: 'http',
						config: {}
				});
				
				invalidTask.on('taskresult', function (err, config, response, task) {
						if (err) { 
							promise.emit('success', err); 
						}
				});
				invalidTask.run();
				return promise;
			},
			'It failed': function (err) {
				assert.isNotNull(err);
			},
			'Error code equal ENOHOST': function (err) {
				assert.strictEqual(err.code, 'ENOHOST');
			},
			'Error message is valid': function (err) {
				assert.strictEqual(err.message, 'No host defined');
			}
		},
		'When create a valid http action task on www.google.com': {
			topic: function() {
				var
				promise = new events.EventEmitter(),
				task = nettasq.create({
						action: 'http',
						config: {
							host: 'www.google.fr'
						}
				});
				
				task.on('taskresult', function (err, config, response, task) {
						if (err) { 
							promise.emit('error', err); 
						} else { 
							promise.emit('success', config, response, task); 
						}
				});
				task.run();
				return promise;
			},
			'It succeed': function (err, config, response, task) {
				assert.isNull(err);
				assert.equal(config.host, 'www.google.fr');
				assert.isString(response.statusMessage);	
				assert.equal(task.state, 'result');
				assert.strictEqual(response.statusCode, 200);
			},
			'host is valid': function (err, config, response, task) {
				assert.strictEqual(config.host, 'www.google.fr');
			},
			'default timeout is valid': function (err, config, response, task) {
				assert.strictEqual(config.timeout, 1);
			},
			'date is set': function (err, config, response, task) {
				assert.isTrue(response.date !== undefined);
			},
			'statusMessage is valid': function (err, config, response, task) {
				assert.isString(response.statusMessage);
			}
		},
		'When a valid http action task on www.google.com is finished': {
			topic: function() {
				var
				promise = new events.EventEmitter(),
				task = nettasq.create({
						action: 'http',
						config: {
							host: 'www.google.com'
						}
				});
				
				task.on('done', function (task) {
						promise.emit('success', task); 
				});
				task.run();
				return promise;
			},
			'"done" event is called': function (err, task) {
				assert.isNull(err);
				assert.equal(task.state, 'done');
			}
		},
		'When create a tcp task with no config': {
			topic: function() {
				var
				promise = new events.EventEmitter(),
				invalidTask = nettasq.create({
						action: 'tcp'
				});
				
				invalidTask.on('taskresult', function (err, config, response, task) {
						if (err) { 
							promise.emit('success', err); 
						}
				});
				invalidTask.run();
				return promise;
			},
			'It failed': function (err) {
				assert.isNotNull(err);
			},
			'Error code equal ENOHOST': function (err) {
				assert.strictEqual(err.code, 'ENOHOST');
			},
			'Error message is valid': function (err) {
				assert.strictEqual(err.message, 'No host defined');
			}
		},  
		'When create a tcp task with no config.host': {
			topic: function() {
				var
				promise = new events.EventEmitter(),
				invalidTask = nettasq.create({
						action: 'tcp',
						config: {}
				});
				
				invalidTask.on('taskresult', function (err, config, response, task) {
						if (err) { 
							promise.emit('success', err); 
						}
				});
				invalidTask.run();
				return promise;
			},
			'It failed': function (err) {
				assert.isNotNull(err);
			},
			'Error code equal ENOHOST': function (err) {
				assert.strictEqual(err.code, 'ENOHOST');
			},
			'Error message is valid': function (err) {
				assert.strictEqual(err.message, 'No host defined');
			}
		},
		'When create a valid tcp action task on www.google.com': {
			topic: function() {
				var
				promise = new events.EventEmitter(),
				task = nettasq.create({
						action: 'tcp',
						config: {
							host: 'www.google.com',
							port: 80
						}
				});
				
				task.on('taskresult', function (err, config, response, task) {
						if (err) { 
							promise.emit('error', err); 
						} else { 
							promise.emit('success', config, response, task); 
						}
				});
				task.run();
				return promise;
			},
			'It succeed': function (err, config, response, task) {
				assert.isNull(err);			
				assert.equal(task.state, 'result');
			},
			'host is valid': function (err, config, response, task) {
				assert.strictEqual(config.host, 'www.google.com');
			},
			'default timeout is valid': function (err, config, response, task) {
				assert.strictEqual(config.timeout, 1);
			},
			'date is set': function (err, config, response, task) {
				assert.isTrue(response.date !== undefined);
			}
		},
		'When a valid tcp action task on www.google.com is finished': {
			topic: function() {
				var
				promise = new events.EventEmitter(),
				task = nettasq.create({
						action: 'tcp',
						config: {
							host: 'www.google.com',
							port: 80
						}
				});
				
				task.on('done', function (task) {
						promise.emit('success', task); 
				});
				task.run();
				return promise;
			},
			'"done" event is called': function (err, task) {
				assert.strictEqual(task.config.port, 80);
			}
		},
		'When create a task with an invalid action': {
			topic: function() {
				var
				promise = new events.EventEmitter(),
				invalidTask = nettasq.create({
						action: '#@ù$^%'
				});
				
				invalidTask.on('taskresult', function (err, config, response, task) {
						if (err) { 
							promise.emit('success', err); 
						}
				});
				invalidTask.run();
				return promise;
			},
			'It failed': function (err) {
				assert.isNotNull(err);
			},
			'Error code is valid': function (err) {
				assert.strictEqual(err.code, 'MODULE_NOT_FOUND');
			},
			'Error message is valid': function (err) {
				assert.strictEqual(err.message, 'Cannot find module \'./plugin/#@ù$^%\'');
			}
		},
		'When create a valid tcp action task on www.google.com (taskstart)': {
			topic: function() {
				TASK_RESULT_RECEIVED = false;
				var
				promise = new events.EventEmitter(),
				task = nettasq.create({
						action: 'tcp',
						config: {
							host: 'www.google.com',
							port: 80
						}
				});
				task.on('taskresult', function (err, config, response, task) {
						TASK_RESULT_RECEIVED = true;
				});
				task.on('taskstart', function (config, task) {
						promise.emit('success', config, task); 
				});
				task.run();
				return promise;
			},
			'taskstart event is emitted with config param': function (config, task) {
				assert.equal(config.host, 'www.google.com');
			},
			'taskstart event is emitted with task param': function (config, task) {
				assert.equal(task.state, 'progress');
			},
			'taskstart event is emitted before taskresult event': function (config, task) {
				assert.isFalse(TASK_RESULT_RECEIVED);
			}	
		},
		'When create a valid tcp action task on www.google.com (taskprogress)': {
		topic: function() {
			TASK2_START_RECEIVED = false;
			TASK2_RESULT_RECEIVED = false;
			var
			callCount = 0,
			promise = new events.EventEmitter(),
			task = nettasq.create({
					action: 'tcp',
					config: {
						host: 'www.google.fr',
						port: 80
					}
			});
			task.on('taskstart', function () {
					TASK2_START_RECEIVED = true;
			});
			task.on('taskresult', function () {
					TASK2_RESULT_RECEIVED = true;
			});
			task.on('taskprogress', function (config, task, msg) {
					if (callCount === 0) {
						promise.emit('success', config, task, msg);
					}
					callCount++;
			});
			task.run();
			return promise;
		},
		'taskprogress event is emitted with config param foo': function (config, task, msg) {
			assert.equal(config.host, 'www.google.fr');
		},
		'taskprogress event is emitted with task param': function (config, task, msg) {
			assert.equal(task.state, 'progress');
		},
		'taskprogress event is emitted with msg param': function (config, task, msg) {
			assert.isObject(msg);
		},
		'msg param has got a date property': function (config, task, msg) {
			assert.isTrue(msg.date !== undefined);
		},
		'taskprogress event is emitted before taskresult event': function (config, task, msg) {
			assert.isFalse(TASK2_RESULT_RECEIVED);
		},
		'taskprogress event is emitted after taskstart event': function (config, task, msg) {
			assert.isTrue(TASK2_START_RECEIVED);
		}
	}
});
