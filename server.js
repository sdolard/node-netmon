var
port = 8000,
app = require('http').createServer(handler).listen(port),
io = require('socket.io').listen(app),
fs = require('fs'),
spawn = require('child_process').spawn,
NM = require('./lib/netmon').NetworkMonitor,
monitor = new NM();

console.log('Listening on http://localhost:%d/', port);


io.sockets.on('connection', function (socket) {

	// connect action event
	socket.on('action', function (action) {
		var state = monitor.state;
		action = action.toUpperCase();
		console.log('action : ' + action);
		console.log('monitor state : ' + state);
		if (action === 'START') {

			if (state === 'START') {
				socket.emit('update', "monitor already started!");
				return;
			}

			if (state === 'PAUSE') {
				socket.emit('update', "monitor are pause. juste resume it");
				monitor.resume();

			} else {
				monitor.start();
			}
		}
		if (action === 'PAUSE') {
			if (state === 'PAUSE') {
				socket.emit('update', "monitor already paused!");
				return;
			}
			if (state === 'STOP') {
				socket.emit('update', "monitor can't pause. monitor are stoped!");
				return;
			}
			monitor.pause();
		}
		if (action === 'RESUME') {
			if (state !== 'PAUSE') {
				socket.emit('update', "monitor can only be resume if it's in pause. currently monitor are " + state);
				return;
			}
			monitor.resume();
		}

		if (action === 'STOP') {
			if (state === 'STOP') {
				socket.emit('update', "monitor already stoped!");
				return;
			}
			monitor.stop(function () {
				socket.emit('news', "monitor stoped!");
			});
		}
	});

	socket.emit('news', "welcome. monitor is currently " + monitor.state);
	function output (data) {
		console.log('monitor : %s', data);
		socket.emit('update', data);
	}

	function stateupdate (data) {
		socket.emit('news', data);
	}

	monitor.on('state', stateupdate);
	
	if (monitor.state === 'STOP') {
		monitor.start();
	} else if (monitor.state === 'PAUSE') {
		monitor.resume();
	}

	monitor.on("data", output);

	socket.on("disconnect", function (socket) {
		monitor.removeListener("data", output);
		monitor.removeListener("state", stateupdate);
	});

});

// send to every websocket that the monitor is off 
monitor.on('exit', function () {
	console.log('monitor exit');
	io.sockets.emit('news', "monitor terminated");
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
	monitor.stdin.end();
});
