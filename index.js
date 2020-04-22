const express = require("express");
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'))

let waiting = null;

let games = [
  /*
  {
    naughts: socket,
    crosses: socket
  }
  */ 
]

let winCombos = [
  [0,1,2],
  [3,4,5],
  [6,7,8],
  [0,3,6],
  [1,4,7],
  [2,5,8],
  [0,4,8],
  [2,4,6]
]

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        if(waiting == socket) waiting = null;
        let game = getGame(socket);
        if(game) {
          game.naughts.emit("gameOver","Dein Gegner hat das Spiel verlassen")
          game.crosses.emit("gameOver","Dein Gegner hat das Spiel verlassen")
          let index = games.indexOf(game);
          games.splice(index,1)
        }
        console.log('user disconnected');
    });
    socket.on("play", (msg)=>{
        if(waiting == null) {
          waiting = socket;
          socket.emit("waiting","waiting");
        } else {
          let turn =  Math.round(Math.random())
          games.push({
            turn,
            field: "_________",
            naughts: socket,
            crosses: waiting
          })
          socket.emit("game",{field:"_________",yourTurn: (turn==1 ? true : false),symbol:"O"});
          waiting.emit("game",{field:"_________",yourTurn: (turn==0 ? true : false),symbol:"X"});
          waiting = null;
        }
    })
    socket.on("clicked", msg=>{
      let game = getGame(socket);
      if(!game) {
        console.error("No game found")
        return;
      }
      if(game.turn == 1 && game.naughts == socket || game.turn == 0 && game.crosses == socket) {
        game.field = setCharAt(game.field, msg, getSymbol(game,socket));
        game.turn = game.turn == 1 ? 0 : 1;
        game.naughts.emit("game", {field: game.field, yourTurn: (game.turn==1 ? true : false)})
        game.crosses.emit("game", {field: game.field, yourTurn: (game.turn==0 ? true : false)})

        let playerWon = gameWon(game.field);
        if(playerWon == "X") {
          game.naughts.emit("gameOver","Du hast verloren!");
          game.crosses.emit("gameOver","Du hast gewonnen!");
          let index = games.indexOf(game);
          games.splice(index,1)
        } else if(playerWon == "O") {
          game.naughts.emit("gameOver","Du hast gewonnen!");
          game.crosses.emit("gameOver","Du hast verloren!");
          let index = games.indexOf(game);
          games.splice(index,1)
        }

        for(char of game.field) {
          if(char == "_") return;
        }
        game.naughts.emit("gameOver","Unentschieden!");
        game.crosses.emit("gameOver","Unentschieden!");
        let index = games.indexOf(game);
        games.splice(index,1)
      } else {
        console.error("Other player should be playing!")
      }
    })
});

function getGame(socket) {
  for(game of games) {
    if(game.naughts == socket || game.crosses == socket) return game;
  }
}

function getSymbol(game,socket) {
  if(game.naughts == socket) return "O";
  else return "X";
}

function setCharAt(str,index,chr) {
  if(index > str.length-1) return str;
  return str.substr(0,index) + chr + str.substr(index+1);
}

function gameWon(field) {
  for(winCombo of winCombos) {
    if(field[winCombo[0]] == "X" && field[winCombo[1]] == "X" && field[winCombo[2]] == "X") return "X";
    if(field[winCombo[0]] == "O" && field[winCombo[1]] == "O" && field[winCombo[2]] == "O") return "O";
  }
}

http.listen(3000, () => {
    console.log('listening on *:3000');
});