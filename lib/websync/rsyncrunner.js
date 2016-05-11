/**
 * Created by sander.struijk on 08.08.14.
 */
'use strict';

var Rsync = require('rsync'),
    _ = require('lodash');

var rmd = require('./rsyncmetadata.js'),
    hostManager = require('./hostmanager.js'),
    report = require('./report.js');

function _buildRsyncObject(sourceHost, destinationHost, path, flags) {
    console.log('Building rsync object for path.id: ' + path.id);

    function _combineHostAndPath(host, path) {
        return host.username + '@' + host.host + ':' + path;
    }

    var rsync = new Rsync()
        .source(sourceHost ? _combineHostAndPath(sourceHost, path.source) : path.source)
        .destination(destinationHost ? _combineHostAndPath(destinationHost, path.destination) : path.destination)
        .progress();

    // set all the flags
    flags.forEach(function(flag) {
        console.log(flag);
        rsync.set(flag);
    });

    var shell_cmd = '';
    if (destinationHost && destinationHost.port) {
        shell_cmd = 'ssh -p ' + destinationHost.port + ' -o StrictHostKeyChecking=no';
    } else if (sourceHost && sourceHost.port) {
        shell_cmd = 'ssh -p ' + sourceHost.port + ' -o StrictHostKeyChecking=no';
    } else
        shell_cmd = 'ssh -o StrictHostKeyChecking=no';

    if (destinationHost && destinationHost.password) {
        shell_cmd = '/usr/bin/sshpass -p ' + destinationHost.password + ' ' + shell_cmd;
    } else if (sourceHost && sourceHost.password) {
        shell_cmd = '/usr/bin/sshpass -p' + sourceHost.password + ' ' + shell_cmd;
    }

    rsync.shell(shell_cmd);

    return rsync;
}

module.exports = {
    buildRsyncObjects: function(task) {
        var sourceHost = hostManager.findHost(task.source.host);
        var destinationHost = hostManager.findHost(task.destination.host);
        var rsyncTasks = [];
        _.forEach(task.paths, function(path) {
            if (!(path.source === '' || path.destination === ''))
                rsyncTasks.push(_buildRsyncObject(sourceHost, destinationHost, path, task.flags));
        });
        return rsyncTasks;
    },
    executeRsyncTask: function(rsync, id, io) {
        console.log('Executing rsync object for task.id: ' + id);

        function _splitStringOnNewLine(data) {
            return _.filter(data.toString().split('\n'), function(line) {
                return line !== '';
            });
        }

        //start reporting for this task
        var report_data = report.new(id, 'running');
        report_data.logs = [];

        return rsync.execute(
            function(error, code, cmd) {
                report_data.status = 'complete';
                if (error)
                    report_data.status = 'error';

                report.update(report_data);
                var errorCodeMessage = rmd.getErrorCode(code);
                var errorMessage = error ? error.toString() : error;
                io.emit('task.finished.' + id, {
                    error: errorMessage,
                    errorCode: {
                        code: code,
                        message: errorCodeMessage
                    },
                    cmd: cmd
                });

            },
            function(data) {
                var lines = _splitStringOnNewLine(data);
                lines.forEach(function(line) {
                    var filteredLine = line.trim();
                    filteredLine = filteredLine.replace('\r', '');
                    if (filteredLine !== '') {
                        report_data.logs.push(line);
                    }

                    io.emit('task.progress.' + id, line);
                });
            },
            function(data) {
                var lines = _splitStringOnNewLine(data);
                lines.forEach(function(line) {
                    report_data.logs.push(line);
                    io.emit('task.error.' + id, line);
                });
            }
        );
    }
};
