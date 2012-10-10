/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/


var 
vows = require('vows'),
assert = require('assert'),
util = require('util'),
events = require("events"),
tcp = require('../lib/plugin/tcp'), 
emptyFn = function() {};

exports.suite1 = vows.describe('tcp').addBatch({
		'When checking www.google.com': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				tcp.run('', {
						port: 80,
						host: 'www.google.com'
				}, function (err, config, response) {
					if (err) { 
						promise.emit('error', err, config, response); 
					} else { 
						promise.emit('success', config, response);
					}
				}, emptyFn);
				return promise;
			},
			'host is www.google.com': function (err, config, response) {
				assert.equal(config.host, 'www.google.com');		
			},
			'Default port is 80': function (err, config, response) {
				assert.equal(config.port, 80);	
			},
			
			'Default timout is valid': function (err, config, response) {
				assert.equal(config.timeout, 2);		
			},
			'It succeed': function (err, config, response) {
				assert.isNotNull(response);
			},
			'date is set': function (err, config, response) {
				assert.isNotNull(response.date);
			}
		},
		'When checking an invalid hostname': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				tcp.run('', {
						port: 80,
						host: '---&'
				}, function (err, config, response) {
					if (err) { 
						promise.emit('error', err, config, response); 
					} else {
						promise.emit('success', config, response);
					}
				}, emptyFn);
				return promise;
			},
			'response is valid': function (err, config, response) {
				assert.equal(config.host, '---&');
			},
			'It failed': function (err, config, response) {
				assert.equal(err.code, 'ENOTFOUND');
			},
			'response is indefined': function (err, config, response) {
				assert.isUndefined(response);
			}
		},
		'When checking google on evil port with a 500ms timeout': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				tcp.run('', {
						host: 'www.google.com', 
						port: 666,
						timeout: 1
				}, function (err, config, response) {
					if (err) { 
						promise.emit('error', err, config, response); 
					} else {
						promise.emit('success', config, response);
					}
				}, emptyFn);
				return promise;
			},
			'It failed in 500ms': function (err, config, response) {
				assert.equal(err.code, 'ETIMEOUT');
				assert.equal(config.port, 666);
				assert.equal(config.timeout, 1);
			},
			'response is indefined': function (err, config, response) {
				assert.isUndefined(response);
			}
		}	
});
