/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/


var 
vows = require('vows'),
assert = require('assert'),
util = require('util'),
events = require("events"),
nettasq = require('../lib/nettask');

exports.suite1 = vows.describe('nettask').addBatch({
		'When create a empty task': {
			topic: function() {
				var
				promise = new events.EventEmitter(),
				invalidPingTask = nettasq.create();
				
				invalidPingTask.on('result', function (err, r, task) {
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
				
				invalidPingTask.on('result', function (err, r, task) {
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
			'Error code equal EINVALIDCONFIG': function (err) {
				assert.strictEqual(err.code, 'EINVALIDCONFIG');
			},
			'Error message equal "config is undefined"': function (err) {
				assert.strictEqual(err.message, 'config is undefined');
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
				
				invalidPingTask.on('result', function (err, r, task) {
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
			'Error code equal EINVALIDCONFIGHOST': function (err) {
				assert.strictEqual(err.code, 'EINVALIDCONFIGHOST');
			},
			'Error message equal "config.host is undefined"': function (err) {
				assert.strictEqual(err.message, 'config.host is undefined');
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
				
				pingTask.on('result', function (err, r, task) {
						if (err) { 
							promise.emit('error', err); 
						} else { 
							promise.emit('success', r); 
						}
				});
				pingTask.run();
				return promise;
			},
			'It succeed': function (err, r) {
				assert.isNotNull(r);
				assert.strictEqual(r.exitCode, 0);
			},
			'host is set to localhost': function (err, r) {
				assert.strictEqual(r.host, 'localhost');
			},
			'default timeout equals 2': function (err, r) {
				assert.strictEqual(r.timeout, 2);
			},
			
			'ipv6 is disabled by default': function (err, r) {
				assert.isFalse(r.ipV6);
			},
			'date is set': function (err, r) {
				assert.isNotNull(r.date);
			},
			'data is a string': function (err, r) {
				assert.isString(r.data);
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
				assert.strictEqual(task.config.exitCode, 0);
			}
		}
});
