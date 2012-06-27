/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/


var
util = require('util'),

// contrib
netasqComm = require('netasqcomm'),

// Global var
emptyFn = function () {};


/** 
* @function
* connect to a NETASQ appliance and run script related in config
* 
* @param Object config an object containing all information needed to check an http connection
* @param String config.host the host to connect
* @param Number [config.port=443] the port number to use.

* @param Number [config.timeout=2] connection timeout in s
*
* @param Function callback({Error}err, {Object} response) called when request is done
*/
function run (/**{object}*/ config, /**{function}*/ callback) {
	config = config || {};
	config.filename = config.filename || '';

	config.host = config.host || '';
	config.timeout = config.timeout || 2; // s
	callback = callback || emptyFn;



}
exports.run = run;
