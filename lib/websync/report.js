/**
 * Created by crazyfish on 3/24/16.
 */
'use strict';
var path = require('path'),
    uuid = require('uuid'),
    _ = require('lodash'),
    low = require('lowdb'),
    db = low(__dirname + '/../../reportss.json',
        {
            storage: require('lowdb/file-async')
        });

function _msToTime(duration) {
    var milliseconds = parseInt((duration % 1000) / 100),
        seconds = parseInt((duration / 1000) % 60),
        minutes = parseInt((duration / (1000 * 60)) % 60),
        hours = parseInt((duration / (1000 * 60 * 60)) % 24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

function _getFormattedDate(date) {
    var year = date.getFullYear();
    var month = (1 + date.getMonth()).toString();
    month = month.length > 1 ? month : '0' + month;
    var day = date.getDate().toString();
    day = day.length > 1 ? day : '0' + day;
    var hour = date.getHours();
    var minute = date.getMinutes().toString();
    minute = minute.length > 1 ? minute : '0' + minute;
    var seconds = date.getSeconds().toString();
    seconds = seconds.length > 1 ? seconds : '0' + seconds;
    var timeString = hour + ':' + minute + ':' + seconds + ' AM';
    timeString = parseInt(hour) < 12 ? timeString : (parseInt(hour) - 12) + ':' + minute + ':' + seconds + ' PM';
    return year + '-' + month + '-' + day + ' ' + timeString;
}

var report = module.exports = {
    new: function(task_id, status) {
        var report_id = uuid(),
            started = new Date();
        db('reports').push({
            id: report_id,
            taskId: task_id,
            status: status,
            statusClass: 'info',
            started: _getFormattedDate(started)
        });
        db.write();
        return {
            id: report_id,
            taskId: task_id,
            started: started
        };
    },
    update: function(data) {
        var statusClass = data.status === 'error' ? 'danger' : 'success';
        var stopped = new Date();
        db('reports')
            .chain()
            .find({id: data.id})
            .assign({
                status: data.status,
                stopped: _getFormattedDate(stopped),
                duration: _msToTime(stopped.getTime() - data.started.getTime()),
                statusClass: statusClass,
                logs: data.logs
            })
            .value();
        db.write();
    },
    getReports: function(taskId) {
        return db('reports')
            .chain()
            .filter({taskId: taskId})
            .sortBy('started')
            .value();
    }
};
