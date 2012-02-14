var app = require('http').createServer(handler).listen(8000)
	, io = require('socket.io').listen(app)
	, fs = require('fs')
	, spawn = require('child_process').spawn
	, util = require('util')
	, ON = "ON"
	, OFF = "OFF"
	, pingState = OFF;



ping = spawn('ping', ['www.google.com']);
pingState = ON;

io.sockets.on('connection', function (socket) {

	socket.emit('news', "welcome. Ping is currently " + pingState);
	function output (data) {
		console.log('ping : %s', data);
		socket.emit('update', data.toString());
		//socket.emit('update', 'ping emit!');
	}

	if (pingState === ON) {
		ping.stdout.on("data", output);

		socket.on("disconnect", function (socket) {
			ping.stdout.removeListener("data", output);
		});
	}

});

// send to every websocket that the ping is off 
ping.on('exit', function () {
	console.log('ping exit');
	pingState = OFF;
	io.sockets.emit('news', "ping terminated");
});



function handler (req, res) {
	fs.readFile(__dirname + '/index.html',
		function (err, data) {
			if (err) {
			res.writeHead(500);
			return res.end('Error loading index.html');
		}

		res.writeHead(200);
		res.end(data);
	});
}

app.on('close', function () {
	ping.stdin.end();
});
