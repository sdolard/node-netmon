/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/


var
assert = require('assert'),
nettasq = require('../lib/nettask');
/*,
TASK_RESULT_RECEIVED = false,
TASK2_START_RECEIVED = false,
TASK2_RESULT_RECEIVED = false*/

describe('nettask', function(){
	it ('should throw an Exception when creating an empty task', function(done){
		try {
			var task = nettasq.create();
		} catch(err) {
			assert(err instanceof Error);
			assert.strictEqual(err.code, 'EINVALIDACTION');
			assert.strictEqual(err.message, 'action is undefined');
			done();
		}
	});

	it ('should return an error on taskresult when creating a ping task with no config', function(done){
		var task = nettasq.create({
			action: 'ping'
		});
		task.on('taskresult', function (err, config, response, task) {
			assert(err instanceof Error);
			assert.strictEqual(err.code, 'ENOHOST');
			assert.strictEqual(err.message, 'No host defined');
			done();
		});
		task.run();
	});

	it ('should return an error on taskresult when creating a ping task with no config.host', function(done){
		var task = nettasq.create({
			action: 'ping',
			config: {}
		});
		task.on('taskresult', function (err, config, response, task) {
			assert(err instanceof Error);
			assert.strictEqual(err.code, 'ENOHOST');
			assert.strictEqual(err.message, 'No host defined');
			done();
		});
		task.run();
	});

	it ('should ping localhost', function(done){
		var task = nettasq.create({
			action: 'ping',
			config: {
				host: 'localhost'
			}
		});
		task.on('taskresult', function (err, config, response, task) {
			assert.strictEqual(response.exitCode, 0);
			assert.strictEqual(config.host, 'localhost');
			assert.strictEqual(config.timeout, 1);
			assert(!config.ipV6);
			assert(response.date instanceof Date);
			assert.equal(typeof response.data, 'string');
			done();
		});
		task.run();
	});

	it ('should call done event', function(done){
		var task = nettasq.create({
			action: 'ping',
			config: {
				host: 'localhost'
			}
		});
		task.on('done', function (task) {
			assert.equal(task.state, 'done');
			done();
		});
		task.run();
	});

	it ('should return an error on taskresult when creating a http task with no config', function(done){
		var task = nettasq.create({
			action: 'http'
		});
		task.on('taskresult', function (err, config, response, task) {
			assert(err instanceof Error);
			assert.strictEqual(err.code, 'ENOHOST');
			assert.strictEqual(err.message, 'No host defined');
			done();
		});
		task.run();
	});

	it ('should return an error on taskresult when creating a http task with no config.host', function(done){
		var task = nettasq.create({
			action: 'http',
			config: {}
		});
		task.on('taskresult', function (err, config, response, task) {
			assert(err instanceof Error);
			assert.strictEqual(err.code, 'ENOHOST');
			assert.strictEqual(err.message, 'No host defined');
			done();
		});
		task.run();
	});

	it ('should connect to www.google.fr on port 80 (http)', function(done){
		var task = nettasq.create({
			action: 'http',
			config: {
				host: 'www.google.fr'
			}
		});
		task.on('taskresult', function (err, config, response, task) {
			assert.equal(err, null);
			assert.equal(config.host, 'www.google.fr');
			assert.equal(typeof response.statusMessage, 'string');
			assert.equal(task.state, 'result');
			assert.strictEqual(response.statusCode, 200);
			assert.strictEqual(config.host, 'www.google.fr');
			assert.strictEqual(config.timeout, 1);
			assert(response.date instanceof Date);
			done();
		});
		task.run();
	});

	it ('should call done event when connected to www.google.fr on port 80 (http)', function(done){
		var task = nettasq.create({
			action: 'http',
			config: {
				host: 'www.google.fr'
			}
		});
		task.on('done', function ( task) {
			assert.equal(task.state, 'done');
			done();
		});
		task.run();
	});

	it ('should return an error on taskresult when creating a tcp task with no config', function(done){
		var task = nettasq.create({
			action: 'tcp'
		});
		task.on('taskresult', function (err, config, response, task) {
			assert(err instanceof Error);
			assert.strictEqual(err.code, 'ENOHOST');
			assert.strictEqual(err.message, 'No host defined');
			done();
		});
		task.run();
	});

	it ('should return an error on taskresult when creating a tcp task with no config.host', function(done){
		var task = nettasq.create({
			action: 'tcp',
			config: {}
		});
		task.on('taskresult', function (err, config, response, task) {
			assert(err instanceof Error);
			assert.strictEqual(err.code, 'ENOHOST');
			assert.strictEqual(err.message, 'No host defined');
			done();
		});
		task.run();
	});

	it ('should connect to www.google.com on port 80 (tcp)', function(done){
		var task = nettasq.create({
			action: 'tcp',
			config: {
				host: 'www.google.com',
				port: 80
			}
		});
		task.on('taskresult', function (err, config, response, task) {
			assert.equal(err, null);
			assert.equal(task.state, 'result');
			assert.strictEqual(config.host, 'www.google.com');
			assert.strictEqual(config.timeout, 1);
			assert(response.date instanceof Date);
			done();
		});
		task.run();
	});

	it ('should call done event when connected to www.google.com on port 80 (tcp)', function(done){
		var task = nettasq.create({
			action: 'tcp',
			config: {
				host: 'www.google.com',
				port: 80
			}
		});
		task.on('done', function (task) {
			assert.strictEqual(task.config.port, 80);
			done();
		});
		task.run();
	});

	it ('should return an error when creating a task with an invalid action', function(done){
		var task = nettasq.create({
			action: '#@ù$^%'
		});
		task.on('error', function (err) {
			assert(err instanceof Error);
			assert.strictEqual(err.code, 'EPLUGINNOTFOUND');
			assert.strictEqual(err.message, 'Plugin not found: "#@ù$^%"');
			done();
		});
		task.run();
	});

	it ('should call taskstart event', function(done){
		var
		resultReceived = false,
		task = nettasq.create({
			action: 'tcp',
			config: {
				host: 'www.google.com',
				port: 80
			}
		});
		task.on('taskresult', function (err, config, response, task) {
			resultReceived = true;
		});
		task.on('taskstart', function (config, task) {
			assert.equal(config.host, 'www.google.com');
			assert.equal(task.state, 'starting');
			assert(!resultReceived);
			done();
		});
		task.run();
	});

	it ('should call taskprogress event', function(done){
		var
		resultReceived = false,
		startReceived = false,
		call = 0,
		task = nettasq.create({
			action: 'tcp',
			config: {
				host: 'www.google.com',
				port: 80
			}
		});
		task.on('taskstart', function () {
			startReceived = true;
		});
		task.on('taskresult', function () {
			resultReceived = true;
		});
		task.on('taskprogress', function (config, task, msg) {
			if (call === 0) {
				call++;
				assert.equal(config.host, 'www.google.com');
				assert.equal(task.state, 'progress');
				assert(msg instanceof Object);
				assert(msg.date instanceof Date);
				assert(!resultReceived);
				assert(startReceived);
				done();
				return;
			}
		});
		task.run();
	});
});

