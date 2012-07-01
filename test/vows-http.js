/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/


var 
vows = require('vows'),
assert = require('assert'),
util = require('util'),
events = require("events"),
nhttp = require('http'),
http = require('../lib/plugin/http');

exports.suite1 = vows.describe('http/s').addBatch({
		'When checking www.google.com': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				http.run({
						host: 'www.google.com'
				}, function (err, config, response) {
					if (err) { 
						promise.emit('error', err, config, response); 
					} else { 
						promise.emit('success', config, response); 
					}
				});
				return promise;
			},
			'host is www.google.com': function (err, config, response) {
				assert.equal(config.host, 'www.google.com');		
			},
			'Default port is 80': function (err, config, response) {
				assert.equal(config.port, 80);	
				assert.isFalse(config.ssl);
			},
			'Default path is /': function (err, config, response) {
				assert.equal(config.path, '/');		
			},
			'Default timout is valid': function (err, config, response) {
				assert.equal(config.timeout, 2);		
			},
			'There is a statusCode': function (err, config, response) {
				assert.isTrue(response.statusCode > 0);		
			},
			'statusMessage corresponds to statusCode': function (err, config, response) {
				assert.isTrue(response.statusMessage === nhttp.STATUS_CODES[response.statusCode.toString()]);		
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
				
				http.run({
						host: '---'
				}, function (err, config, response) {
					if (err) { 
						promise.emit('error', err, config, response); 
					} else {
						promise.emit('success', config, response); 
					}
				});
				return promise;
			},
			'response is valid': function (err, config, response) {
				assert.equal(config.host, '---');
			},
			'It failed': function (err, config, response) {
				assert.equal(err.code, 'ENOTFOUND');
			},
			'reponse is undefined': function (err, config, response) {
				assert.isUndefined(response);
			}
		},
		'When checking google/thispathdonotexists path': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				http.run({
						host: 'www.google.com', 
						path: '/thispathdonotexists'
				}, function (err, config, response) {
					if (err) { 
						promise.emit('error', err, config, response); 
					} else {
						promise.emit('success', config, response); 
					}
				});
				return promise;
			},
			'Path do not exists': function (err, config, response) {
				assert.equal(err.code, 'EUNEXPECTEDSTATUSCODE');
				assert.equal(config.path, '/thispathdonotexists');
			},
			'date is set': function (err, config, response) {
				assert.isNotNull(response.date);
			}
		},
		'When checking google on evil port with a 500ms timeout': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				http.run({
						host: 'www.google.com', 
						port: 666,
						timeout: 1
				}, function (err, config, response) {
					if (err) { 
						promise.emit('error', err, config, response); 
					} else {
						promise.emit('success', config, response); 
					}
				});
				return promise;
			},
			'It failed in 500ms': function (err, config, response) {
				assert.equal(err.code, 'ETIMEOUT');
				assert.equal(config.port, 666);
				assert.equal(config.timeout, 1);
			},
			'reponse is undefined': function (err, config, response) {
				assert.isUndefined(response);
			}
		},
		'When checking mail.google.com with ssl': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				http.run({
						host: 'mail.google.com', 
						ssl: true
				}, function (err, config, response) {
					if (err) { 
						promise.emit('error', err, config, response); 
					} else {
						promise.emit('success', config, response); 
					}
				});
				return promise;
			},
			'It succeed': function (err,config, response) {
				assert.isNotNull(response);
			},
			'Default ssl port is 443': function (err, config, response) {
				assert.equal(config.port, 443);
				assert.isTrue(config.ssl);
			},
			'date is set': function (err, config, response) {
				assert.isNotNull(response.date);
			}
		}	
});
