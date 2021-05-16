/********* zwh9gp5z***********************************/

/**  Set up the static files server **/

let static = require('node-static');

/*** Set up the http server library **/

let http = require('http');

/***  Assume that we are running on Heroku  **/

let port = process.env.PORT;

let directory = __dirname + '/public';

/* if we aren't on Heroku, then we need to adjust our port and directory **/


if((typeof port == 'undefined') || ( port === null)){
	port = 8080;
	directory = './public';
}

/* Set up our static files web server to deliver files from the filesystem */

let file = new static.Server(directory);

let app = http.createServer(
	function(request, response){
		request.addListener('end',
			function(){
				file.serve(request, response);
			}
		
		
		).resume();	
		
	}
).listen(port);

console.log('The server is running');

const { Server } = require('socket.io');
const io = new Server(app);

io.on('connection', (socket) => {
	/* Output a log message on the server and send it to the clients */
	function serverLog(...messages){
		io.emit('log',['**** Message from the server:\t']);
		messages.forEach((item) => {			
			io.emit('log', ['****\t'+item]);
			console.log(item);
		});
	}
	
	serverLog('a page connected to the server: '+socket.id);
	
	socket.on('disconnect', () => {
		serverLog('a page disconnected from the server: '+socket.id);
	});






	/* join room command handler */
	/* expected payload:
		{
			'room': the room to be joined,
			'username': the name of the user joining the room
		}
	*/	
	/* join room response:
		{
			'result': 'success',
			'room': room tha chat was joined,
			'username': the user that joined the chat room
		}
	or
		{
			'result': 'fail',
			'message': the reason for failure
		}
	*/		
	
	socket.on('join_room', (payload) => {
		serverLog('Server received a command','\'join_room\'',JSON.stringify(payload));
		if((typeof payload == 'undefined') || (payload === null)){
			/* Check that the data coming from client is good*/
			resoponse = {};
			response.result = 'fail';
			response.message = 'client did not send a payload';
			socket.emit('join_room_response', response);
			serverLog('join_room command failed', JSON.stringify(response));
			return;
		}
		let room = payload.room;
		let username = payload.username;		
		if((typeof room == 'undefined') || (room === null)){
			resoponse = {};
			response.result = 'fail';
			response.message = 'client did not send a room to join';
			socket.emit('join_room_response', response);
			serverLog('join_room command failed', JSON.stringify(response));
			return;
		}
		if((typeof username == 'undefined') || (username === null)){
			resoponse = {};
			response.result = 'fail';
			response.message = 'client did not send a valid username to join the chat room';
			socket.emit('join_room_response', response);
			serverLog('join_room command failed', JSON.stringify(response));
			return;
		}
		/* hamdle the command */
		socket.join(room);
		
		/* Make sure client was put in the room */
		
		io.in(room).fetchSockets().then((sockets)=>{
			serverLog('There are '+sockets.length+' clients in the room, '+room);
			/* Socket didn't join the room */
			if((typeof sockets == 'undefined') || (sockets == null) || !sockets.includes(socket)){
				let response = {};
				response.results = 'fail';
				response.message = 'Server internal error joining chat room';
				socket.emit('join_room_response', response);
				serverLog('join_room command failed', JSON.stringify(response));
			}
			/* Socket did join room */
			else{
				let response = {};
				response.result = 'success';
				response.room = room;
				response.username = username;
				response.count = sockets.length;
				/* Tell everyone that a new user has joined the cht room */
				io.of('/').to(room).emit('join_room_response', response);
				serverLog('join_room succeeded', JSON.stringify(response));
			}
		});
	});
	
	
	/* send_chat_message command handler */
	/* expected payload:
		{
			'room': the room to which the message should be sent,
			'username': the name of the sender
			/message': the message to broadcast
		}
	*/	
	/* send_chat_message_response response:
		{
			'result': 'success',
			'username': the user that sent the message,
			'message': the message that was sent
		}
	or
		{
			'result': 'fail',
			'message': the reason for failure
		}
	*/		
	
	socket.on('send_chat_message', (payload) => {
		serverLog('Server received a command','\'send_chat_message\'',JSON.stringify(payload));
		if((typeof payload == 'undefined') || (payload === null)){
			/* Check that the data coming from client is good*/
			resoponse = {};
			response.result = 'fail';
			response.message = 'client did not send a payload';
			socket.emit('send_chat_message_response', response);
			serverLog('send_chat_message command failed', JSON.stringify(response));
			return;
		}
		let room = payload.room;
		let username = payload.username;		
		let message = payload.message;		
		if((typeof room == 'undefined') || (room === null)){
			resoponse = {};
			response.result = 'fail';
			response.message = 'client did not send a room to message';
			socket.emit('send_chat_message_response', response);
			serverLog('send_chat_message_response command failed', JSON.stringify(response));
			return;
		}
		if((typeof username == 'undefined') || (username === null)){
			resoponse = {};
			response.result = 'fail';
			response.message = 'client did not send a valid username as a message source';
			socket.emit('send_chat_message_response', response);
			serverLog('send_chat_message_response command failed', JSON.stringify(response));
			return;
		}
		if((typeof message == 'undefined') || (message === null)){
			resoponse = {};
			response.result = 'fail';
			response.message = 'client did not send a valid message';
			socket.emit('send_chat_message_response', response);
			serverLog('send_chat_message_response command failed', JSON.stringify(response));
			return;
		}
		/* hamdle the command */
		let response = {};
		response.result = 'success';
		response.username = username;
		response.room = room;
		response.message = message;
		/* Tell everyone in the room what the message is */
		io.of('/').to(room).emit('send_chat_message_response', response);
		serverLog('send_chat_message_response command succeeded', JSON.stringify(response));
	});









});
