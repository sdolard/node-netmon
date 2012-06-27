/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

/**
* load configuration file
*
*/

var
// Node
fs = require('fs'),
// contrib
jsonlint = require('jsonlint');



/**
* take a string and a callback and open givent file and give to the callback the config file
*
* @param String filename The name of file to open
* @param Function callback The function to call when file config is retrive or on an error
*/
function load (filename, callback) {
	fs.readFile(filename, 'utf-8', function (err, data) {
			var config = {};
			if (err) {
				return callback(err, data);
			}
			
			try {
				config = jsonlint.parse(data);
				
			} catch (e) {
				err = e;
				return callback(err, config);
			}
			
			
			try {
				config = JSON.parse(data);
				
			} catch (e_) {
				err = e_;
				
			} finally {
				callback(err, config);
			}
	});
}

exports.load = load;
