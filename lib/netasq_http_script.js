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

* @param Number [config.timeout=2000] connection timeout in ms
*
* @param Function callback({Error}err, {Object} response) called when request is done
*/
function run (/**{object}*/ config, /**{function}*/ callback) {
	config = config || {};

	config.host = config.host || '';
	config.port = config.port || (config.ssl ? 443: 80);
	config.ssl = config.ssl || false;	

	config.script = config.script || '';	
	
	config.timeout = config.timeout || 2000; // ms


	callback = callback || emptyFn;
	
}
exports.run = run;
