/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
assert = require('assert'),
nhttp = require('http'),
http = require('../lib/plugin/http'),
emptyFn = function() {};

describe('http/s', function (){
	it('should ping ww.google.com', function(done) {
		http.run('',
			{
				host: 'www.google.com'
			}, function (err, config, response) {
				assert.equal(config.host, 'www.google.com');
				assert.equal(config.port, 80);
				assert(!config.ssl);
				assert.equal(config.path, '/');
				assert.equal(config.timeout, 1);
				assert(response.statusCode > 0);
				assert(response.statusMessage === nhttp.STATUS_CODES[response.statusCode.toString()]);
				assert(response !== null);
				assert(response.date !== null);
				assert(response.date !== undefined);
				done();
			},
			emptyFn
		);
	});

	it('should not ping \'---\'', function(done) {
		http.run('',
			{
				host: '---'
			}, function (err, config, response) {
				assert.equal(config.host, '---');
				assert.equal(err.code, 'ENOTFOUND');
				assert.equal(response, undefined);
				done();
			},
			emptyFn
		);
	});

	it('should not ping google/thispathdoesnotexist', function(done) {
		http.run('',
			{
				host: 'www.google.com',
				path: '/thispathdoesnotexist'
			}, function (err, config, response) {
				assert.equal(err.code, 'EUNEXPECTEDSTATUSCODE');
				assert.equal(config.path, '/thispathdoesnotexist');
				assert(response.date !== undefined);
				assert(response.date !== null);
				done();
			},
			emptyFn
		);
	});

	it('should failed when pinging google on evil port with a 500ms timeout', function(done) {
		http.run('',
			{
				host: 'www.google.com',
				port: 666,
				timeout: 1
			}, function (err, config, response) {
				assert.equal(err.code, 'ETIMEOUT');
				assert.equal(config.port, 666);
				assert.equal(config.timeout, 1);
				assert.equal(response, undefined);
				done();
			},
			emptyFn
		);
	});

	it('should ping https://mail.google.com', function(done) {
		http.run('',
			{
				host: 'mail.google.com',
				ssl: true
			}, function (err, config, response) {
				assert.equal(config.port, 443);
				assert(config.ssl);
				assert(response !== null);
				assert(response !== undefined);
				assert(response.date !== null);
				assert(response.date !== undefined);
				done();
			},
			emptyFn
		);
	});
});
