'use strict';
var debug = require('debug');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var socket = require('socket.io');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function () {
    debug('Express server listening on port ' + server.address().port);
});

var io = socket(server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// socketIO stuff
io.sockets.on('connection', (socket) => {
    socket.userData = { x: 0, y: 0, z: 0, header: 0 };

    console.log(`${socket.id} connected`);
    socket.emit('setId', { id: socket.id });

    socket.on('disconnect', () => {
        console.log(`Player ${socket.id} disconnected`);
        socket.broadcast.emit('deletePlayer', { id: socket.id });
    });

    socket.on('init', (data) => {
        console.log(`socket.init ${data.model}`);
        socket.userData.model = data.model;
        socket.userData.colour = data.colour;
        socket.userData.x = data.x;
        socket.userData.y = data.y;
        socket.userData.z = data.z;
        socket.userData.headering = data.h;
        socket.userData.pb = data.pb;
        socket.userData.action = "Idle";
    });

    socket.on('update', (data) => {
        socket.userData.x = data.x;
        socket.userData.y = data.y;
        socket.userData.z = data.z;
        socket.userData.headering = data.h;
        socket.userData.pb = data.pb;
        socket.userData.action = data.action;
    });

    socket.on('chat message', (data) => {
        console.log(`chat message: ${data.id} ${data.message}`);
        io.to(data.id).emit('chat message', { id: socket.id, message: data.message });
    });
});

setInterval(function () {
    const nsp = io.of('/');
    let pack = [];
    for (let id in io.sockets.sockets) {
        const socket = nsp.connected[id];
        // Only push sockets that have been initialized
        if (socket.userData.model !== undefined) {
            pack.push({
                id: socket.id,
                model: socket.userData.model,
                colour: socket.userData.colour,
                x: socket.userData.x,
                y: socket.userData.y,
                z: socket.userData.z,
                header: socket.userData.heading,
                pb: socket.userData.pb,
                action: socket.userData.action
            });
        }
    }
    if (pack.length > 0) io.emit('remoteData', pack);
}, 40); // 25 times a second -- 40 ms between each interval 

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});