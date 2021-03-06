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


/* setup the web socket server */

/* setup a registery of palyer information and socket io */
let players = [];

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
			socket_id: socket id of the user joined the room
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
			response = {};
			response.result = 'fail';
			response.message = 'client did not send a payload';
			socket.emit('join_room_response', response);
			serverLog('join_room command failed', JSON.stringify(response));
			return;
		}
		let room = payload.room;
		let username = payload.username;		
		if((typeof room == 'undefined') || (room === null)){
			response = {};
			response.result = 'fail';
			response.message = 'client did not send a room to join';
			socket.emit('join_room_response', response);
			serverLog('join_room command failed', JSON.stringify(response));
			return;
		}
		if((typeof username == 'undefined') || (username === null)){
			response = {};
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
				players[socket.id] = {
					username : username,
					room : room
				}
				/* anounse everyone who is in the room */
				for (const member of sockets){
					let room = players[member.id].room;
					response = {
						result: 'success',
						socket_id:member.id,
						room : players[member.id].room,
						username : players[member.id].username,
						count : sockets.length
					}
					/* Tell everyone that a new user has joined the cht room */
					io.of('/').to(room).emit('join_room_response', response);
					serverLog('join_room succeeded', JSON.stringify(response));
					
					if(room!=='Lobby'){
						send_game_update(socket, room, 'initial update');
					}
					
					
				}
			}
		});
	});
	
	
	socket.on('invite', (payload) => {
		serverLog('Server received a command','\'invite\'',JSON.stringify(payload));
		if((typeof payload == 'undefined') || (payload === null)){
			/* Check that the data coming from client is good*/
			response = {};
			response.result = 'fail';
			response.message = 'client did not send a payload';
			socket.emit('invite_response', response);
			serverLog('invite command failed', JSON.stringify(response));
			return;
		}
		let requested_user = payload.requested_user;
		let room = players[socket.id].room;
		let username = players[socket.id].username;		
		if((typeof requested_user == 'undefined') || (requested_user === null) || (requested_user === "")){
			response = {
				result: 'fail',
				message: 'client did not request avalid user to invite to play'
			}
			socket.emit('invite_response', response);
			serverLog('invite command failed', JSON.stringify(response));
			return;
		}
				
		if((typeof room == 'undefined') || (room === null) || (room === "")){
			response = {
				result: 'fail',
				message: 'the user that was invited is not in a room'
			}
			socket.emit('invite_response', response);
			serverLog('invite command failed', JSON.stringify(response));
			return;
		}
		if((typeof username == 'undefined') || (username === null) || (username === "")){
			response = {
				result: 'fail',
				message: 'the user that was invited does not have a name registered'
			}
			socket.emit('invite_response', response);
			serverLog('invite command failed', JSON.stringify(response));
			return;
		}

		/* Make sure that the invited user is present */
		
		io.in(room).allSockets().then((sockets)=>{

			/* Invitee isn't in the room */
			if((typeof sockets == 'undefined') || (sockets == null) || !sockets.has(requested_user)){
				response = {
				result: 'fail',
				message: 'the user that was invited is not longer in the room'
				}
				socket.emit('invite_response', response);
				serverLog('invite command failed', JSON.stringify(response));
				return;
			}
			/* Invitee is in the room */
			else{
				response = {
					result: 'success',
					socket_id: requested_user
				}
				socket.emit("invite_response", response);

				response = {
					result: 'success',
					socket_id: socket.id
				}
				socket.to(requested_user).emit("invited", response);
				serverLog('invite command succeeded', JSON.stringify(response));
				
			}
		});
	});	
	
	socket.on('uninvite', (payload) => {
		serverLog('Server received a command','\'uninvite\'',JSON.stringify(payload));
		if((typeof payload == 'undefined') || (payload === null)){
			/* Check that the data coming from client is good*/
			response = {};
			response.result = 'fail';
			response.message = 'client did not send a payload';
			socket.emit('uninvited', response);
			serverLog('uninvite command failed', JSON.stringify(response));
			return;
		}
		let requested_user = payload.requested_user;
		let room = players[socket.id].room;
		let username = players[socket.id].username;		
		if((typeof requested_user == 'undefined') || (requested_user === null) || (requested_user === "")){
			response = {
				result: 'fail',
				message: 'client did not request a valid user to uninvite'
			}
			socket.emit('uninvited', response);
			serverLog('uninvite command failed', JSON.stringify(response));
			return;
		}
				
		if((typeof room == 'undefined') || (room === null) || (room === "")){
			response = {
				result: 'fail',
				message: 'the user that was uninvited is not in a room'
			}
			socket.emit('invite_response', response);
			serverLog('uninvite command failed', JSON.stringify(response));
			return;
		}
		if((typeof username == 'undefined') || (username === null) || (username === "")){
			response = {
				result: 'fail',
				message: 'the user that was uninvited does not have a name registered'
			}
			socket.emit('uninvited', response);
			serverLog('uninvite command failed', JSON.stringify(response));
			return;
		}

		/* Make sure that the invited user is present */
		
		io.in(room).allSockets().then((sockets)=>{

			/* Uninvitee isn't in the room */
			if((typeof sockets == 'undefined') || (sockets == null) || !sockets.has(requested_user)){
				response = {
				result: 'fail',
				message: 'the user that was uninvited is not longer in the room'
				}
				socket.emit('uninvited', response);
				serverLog('uninvite command failed', JSON.stringify(response));
				return;
			}
			/* Uninvitee is in the room */
			else{
				response = {
					result: 'success',
					socket_id: requested_user
				}
				socket.emit("uninvited", response);

				response = {
					result: 'success',
					socket_id: socket.id
				}
				socket.to(requested_user).emit("uninvited", response);
				serverLog('uninvite command succeeded', JSON.stringify(response));
				
			}
		});
	});
	
	socket.on('game_start', (payload) => {
		serverLog('Server received a command','\'game_start\'',JSON.stringify(payload));
		if((typeof payload == 'undefined') || (payload === null)){
			/* Check that the data coming from client is good*/
			response = {};
			response.result = 'fail';
			response.message = 'client did not send a payload';
			socket.emit('game_start_response', response);
			serverLog('game start command failed', JSON.stringify(response));
			return;
		}
		let requested_user = payload.requested_user;
		let room = players[socket.id].room;
		let username = players[socket.id].username;		
		if((typeof requested_user == 'undefined') || (requested_user === null) || (requested_user === "")){
			response = {
				result: 'fail',
				message: 'client did not request a valid user to ingage in play'
			}
			socket.emit('game_start_response', response);
			serverLog('game start command failed', JSON.stringify(response));
			return;
		}
				
		if((typeof room == 'undefined') || (room === null) || (room === "")){
			response = {
				result: 'fail',
				message: 'the user that was engaged to play is not in a room'
			}
			socket.emit('game_start_response', response);
			serverLog('game start command failed', JSON.stringify(response));
			return;
		}
		if((typeof username == 'undefined') || (username === null) || (username === "")){
			response = {
				result: 'fail',
				message: 'the user that was engaged to play not have a name registered'
			}
			socket.emit('game_start_response', response);
			serverLog('game start command failed', JSON.stringify(response));
			return;
		}

		/* Make sure that the player to engage is present */
		
		io.in(room).allSockets().then((sockets)=>{

			/* Engaged player isn't in the room */
			if((typeof sockets == 'undefined') || (sockets == null) || !sockets.has(requested_user)){
				response = {
				result: 'fail',
				message: 'the user that was engaed to play is no longer in the room'
				}
				socket.emit('game_start_response', response);
				serverLog('game start command failed', JSON.stringify(response));
				return;
			}
			/* Engaged player is in the room */
			else{
				
				let game_id = Math.floor(1 + Math.random() * 0X100000).toString(16);
				response = {
					result: 'success',
					game_id: game_id,
					socket_id: requested_user
				}
				socket.emit("game_start_response", response);
				socket.to(requested_user).emit("game_start_response", response);
				serverLog('game start command succeeded', JSON.stringify(response));
				
			}
		});
	});
	
	
	socket.on('disconnect', () => {
		serverLog('a page disconnected from the server: '+socket.id);
		if((typeof players[socket.id] != 'undefined') && (players[socket.id] != null)){
			let payload = {
				username:players[socket.id].username,
				room : players[socket.id].room,
				count: Object.keys(players).length - 1,
				socket_id: socket.id
			};
			let room = players[socket.id].room;
			delete players[socket.id];
			/* Tell everyone who left the room */

			io.of("/").to(room).emit('player_disconnected', payload);
			serverLog('player_disconnected succeeded ', JSON.stringify(payload));

		}

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
			response = {};
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
			response = {};
			response.result = 'fail';
			response.message = 'client did not send a room to message';
			socket.emit('send_chat_message_response', response);
			serverLog('send_chat_message_response command failed', JSON.stringify(response));
			return;
		}
		if((typeof username == 'undefined') || (username === null)){
			response = {};
			response.result = 'fail';
			response.message = 'client did not send a valid username as a message source';
			socket.emit('send_chat_message_response', response);
			serverLog('send_chat_message_response command failed', JSON.stringify(response));
			return;
		}
		if((typeof message == 'undefined') || (message === null)){
			response = {};
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
	
		
	socket.on('play_token', (payload) => {
		serverLog('Server received a command','\'play_token\'',JSON.stringify(payload));
		if((typeof payload == 'undefined') || (payload === null)){
			/* Check that the data coming from client is good*/
			response = {};
			response.result = 'fail';
			response.message = 'client did not send a payload';
			socket.emit('play_token_response', response);
			serverLog('play_token command failed', JSON.stringify(response));
			return;
		}
		let player = players[socket.id];		
		if((typeof player == 'undefined') || (player === null)){
			response = {};
			response.result = 'fail';
			response.message = 'play_token come from an unregistered player';
			socket.emit('play_token_response', response);
			serverLog('play_token command failed', JSON.stringify(response));
			return;
		}
		let username = player.username;
		if((typeof username == 'undefined') || (username === null)){
			response = {};
			response.result = 'fail';
			response.message = 'play_token did not come from an registered player';
			socket.emit('play_token_response', response);
			serverLog('play_token_response command failed', JSON.stringify(response));
			return;
		}
		let game_id = player.room;
		if((typeof game_id == 'undefined') || (game_id === null)){
			response = {};
			response.result = 'fail';
			response.message = 'There was no valid game associated with player token command';
			socket.emit('play_token_response', response);
			serverLog('play_token_response command failed', JSON.stringify(response));
			return;
		}
		let row = player.row;
		if((typeof row == 'undefined') || (row === null)){
			response = {};
			response.result = 'fail';
			response.message = 'There was no valid row associated with player token command';
			socket.emit('play_token_response', response);
			serverLog('play_token_response command failed', JSON.stringify(response));
			return;
		}
		let column = player.column;
		if((typeof column == 'undefined') || (column === null)){
			response = {};
			response.result = 'fail';
			response.message = 'There was no valid column associated with player token command';
			socket.emit('play_token_response', response);
			serverLog('play_token_response command failed', JSON.stringify(response));
			return;
		}
		let color = player.color;
		if((typeof color == 'undefined') || (color === null)){
			response = {};
			response.result = 'fail';
			response.message = 'There was no valid color associated with player token command';
			socket.emit('play_token_response', response);
			serverLog('play_token_response command failed', JSON.stringify(response));
			return;
		}
		let game = games[game_id];
		if((typeof game == 'undefined') || (game === null)){
			response = {};
			response.result = 'fail';
			response.message = 'There was no valid game associated with player token command';
			socket.emit('play_token_response', response);
			serverLog('play_token_response command failed', JSON.stringify(response));
			return;
		}
		
		let response = {
			result: 'success'
		}
		socket.emit('play_token_response', response);
		/* Execute the move */
		if(color === 'white'){
			game.board[row][column] = 'w';
			game.whose_turn = 'black';
		}
		else if(color === 'black'){
			game.board[row][column] = 'b';
			game.whose_turn = 'white';
		}
		
		send_game_update(socket, game_id, 'played a token');
	});
});




/******************/

/* code related to game **/

let games = [];

function create_new_game(){
	let new_game = {};
	new_game.player_white = {};
	new_game.player_white.socket = "";
	new_game.player_white.username = "";
	new_game.player_black = {};
	new_game.player_black.socket = "";
	new_game.player_black.username = "";
	
	var d = new Date();
	new_game.last_move_time = d.getTime();
	
	new_game.whose_turn = 'white';
	
	new_game.board =[
		[' ',' ',' ',' ',' ',' ',' ',' '],
		[' ',' ',' ',' ',' ',' ',' ',' '],
		[' ',' ',' ',' ',' ',' ',' ',' '],
		[' ',' ',' ','w','b',' ',' ',' '],
		[' ',' ',' ','b','w',' ',' ',' '],
		[' ',' ',' ',' ',' ',' ',' ',' '],
		[' ',' ',' ',' ',' ',' ',' ',' '],
		[' ',' ',' ',' ',' ',' ',' ',' ']
	];
	
	return new_game;
	
}

function send_game_update(socket, game_id, message){
	
	if((typeof games[game_id] == "undefined") || (games[game_id] === null)){
		console.log("no game exists with game_id:" + game_id + ". Making a new game");
		games[game_id] = create_new_game();
	}
	
	/* make sure that ony 2 people are in the room */
	/* assign this socket a color */	
	io.of('/').to(game_id).allSockets().then((sockets) =>{
		
		const iterator = sockets[Symbol.iterator]();
		if (sockets.size>=1){
			let first = iterator.next().value;
			if((games[game_id].player_white.socket != first) &&
				(games[game_id].player_black.socket !=first)){
					if(games[game_id].player_white.socket === ""){
					/* This game should be wjote */	
						console.log("White is assigned to: " + first);
						games[game_id].player_white.socket = first;
						games[game_id].player_white.username = players[first].username;
					}
					else if(games[game_id].player_black.socket === ""){
					/*** This game should be black****/	
						console.log("Black is assigned to: " + first);
						games[game_id].player_black.socket = first;
						games[game_id].player_black.username = players[first].username;
					}
					else{
					/* Kicking out from game */
						
					console.log("Kicking " + first + " out of game: } "+game_id);
					io.in(first).socketsLeave([game_id]);
					}
				}
		}
		if (sockets.size>=2){
			let second = iterator.next().value;
			if((games[game_id].player_white.socket != second) &&
				(games[game_id].player_black.socket !=second)){
					if(games[game_id].player_white.socket === ""){
					/* This game should be wjote */	
						console.log("White is assigned to: " + second);
						games[game_id].player_white.socket = second;
						games[game_id].player_white.username = players[second].username;
					}
					else if(games[game_id].player_black.socket === ""){
					/* ** This game should be black*** */	
						console.log("Black is assigned to: " + second);
						games[game_id].player_black.socket = second;
						games[game_id].player_black.username = players[second].username;
					}
					else{
					/* Kicking out from game */
						
					console.log("Kicking " + second + " out of game: } "+game_id);
					io.in(second).socketsLeave([game_id]);
					}
				}
		}
	
		let payload = {
			result: "success",
			game_id: game_id,
			game: games[game_id],
			message: message
		}
		io.of("/").to(game_id).emit('game_update', payload);
	})
/* check if game is over */	
}

