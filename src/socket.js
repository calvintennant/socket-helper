"use strict"

var WebSocket = require('ws');

var Message = require('./message');
var StreamMgr = require('./stream');

var server = null;

exports.port = 3002;
exports.clientSockets = [];
var statusCheckStream;
exports.checkStatus = function checkStatus(cb) {
    var client = new WebSocket('ws://localhost:' + exports.port);

    if (!statusCheckStream) {
        statusCheckStream = new StreamMgr.Stream();
    }

    statusCheckStream.start();

    client.on('open', function() {
        var message = new Message('STATUSCHECK', statusCheckStream.prefix);
        client.send(message.encode(), function(err) {
            if (err) {
                cb(err);
                return;
            }

            // Timeout allows message to arrive before terminating the client.
            setTimeout(function() {
                statusCheckStream.end();
                client.terminate();
                cb(null);
            }, 10);
        });
    });
};

exports.startServer = function startServer(cb) {
    if (server !== null) {
        cb(null);
        return this;
    }

    server = new WebSocket.Server({
        port: exports.port,
    }, cb);

    server.on('connection', handleServerConnection);
    server.on('error', handleServerError);
    server.on('headers', handleServerHeaders);
    return this;
};

exports.stopServer = function stopServer(cb) {
    if (server === null) {
        cb('no server');
    }

    server.close(cb);
    server = null;
};

exports.getServer = function getServer() {
    return server;
};

function handleClientClose(event) {
    var streamPrefix, clientSocketIndex = exports.clientSockets.indexOf(this);

    if (clientSocketIndex === -1) {
        return null;
    }

    for (streamPrefix in socketStreamMap[clientSocketIndex]) {
        if (StreamMgr.streams[streamPrefix]) {
            StreamMgr.streams[streamPrefix].closeClient(clientSocketIndex);
        }
    }

    socketStreamMap[clientSocketIndex] = null
    exports.clientSockets[clientSocketIndex] = null;
};

function handleClientError(err) {
    // @TODO
};

function handleClientException(exception) {
    // @TODO
}

var socketStreamMap = {};
function handleClientMessage(message) {
    var stream, streamPrefix = message.substr(0, StreamMgr.streamPrefixLength);
    var clientSocketIndex;

    if (message.length > Message.maxLength) {
        handleClientException(null);
        return;
    }

    if (streamPrefix && (stream = StreamMgr.streams[streamPrefix])) {
        clientSocketIndex = exports.clientSockets.indexOf(this);

        socketStreamMap[clientSocketIndex] = socketStreamMap[clientSocketIndex] || {};
        socketStreamMap[clientSocketIndex][streamPrefix] = true;
        stream.clientSockets[clientSocketIndex] = true;

        stream.push(new Message(message, streamPrefix, clientSocketIndex));
    } else {
        handleClientException(message);
    }
};

function handleClientOpen(event) {
    // @TODO
};

function handleServerConnection(clientSocket) {
    exports.clientSockets.push(clientSocket);

    clientSocket.on('close', handleClientClose);
    clientSocket.on('error', handleClientError);
    clientSocket.on('open', handleClientOpen);
    clientSocket.on('message', handleClientMessage);
};

function handleServerError(event) {
    // @TODO
};

function handleServerHeaders(event) {
    // @TODO
};

