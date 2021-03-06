/**
 * Created by furier on 29/03/14.
 */
'use strict';

var _ = require('lodash');

module.exports = function (toolkit, Restangular) {

    var guid = toolkit.guid;
    var tasks = Restangular.all('tasks').getList().$object;

    Restangular.extendModel('tasks', function (task) {

        if (!task.id) {
            task.id = guid();
        }

        task.hasFlag = function (flag) {
            var found = false;
            task.flags.forEach(function (value) {
                if (flag.short === value) {
                    found = true;
                }
            });
            return found;
        };
        task.toggleFlag = function (flag) {
            if (task.hasFlag(flag)) {
                // Remove flag
                var index = task.flags.indexOf(flag.short);
                if (index > -1) {
                    task.flags.splice(index, 1);
                }
            }
            else {
                // Add flag
                task.flags.push(flag.short);
            }
        };
        task.run = function () {
            console.debug('run task.id: ' + task.id);
            Restangular.one('runtask', task.id).post().then(function () {
                task.inProgress = true;
            });
        };
        task.test = function () {
            console.debug('test task.id: ' + task.id);
            Restangular.one('testtask', task.id).post().then(function () {
                task.inProgress = true;
            });
        };
        task.cancel = function () {
            console.debug('canceling task.id: ' + task.id);
            Restangular.one('canceltask', task.id).post().then(function () {
                task.inProgress = false;
            });
        };
        task.addPath = function (path) {
            console.debug('adding path for task.id: ' + task.id);
            task.paths.push(path);
            saveTask(task);
        };
        task.injectAfterPath = function (path, path2Inject) {
            console.debug('cloning path for task.id: ' + task.id);
            var index = task.paths.indexOf(path);
            task.paths.splice(index + 1, 0, path2Inject);
            saveTask(task);
        };
        task.removePath = function (path) {
            console.debug('removing path for task: ' + task.id);
            var index = task.paths.indexOf(path);
            task.paths.splice(index, 1);
            saveTask(task);
        };
        task.save = function () {
            saveTask(task);
        };
        task.saveDelayed = function (n, o) {
            if (n === o) {
                return;
            }
            toolkit.delayAction('task', function () {
                saveTask(task);
            }, 500);
        };
        task.delete = function () {
            removeTask(task);
        };
        task.toggleScheduleEnabled = function () {
            task.schedule.enabled = !task.schedule.enabled;
        };
        task.clone = function (e) {
            var clonedTask = _.clone(task);
            clonedTask.id = guid();
            //If cloning a task in progress the new one should not have its state set to in progress
            clonedTask.inProgress = false;
            tasks.post(clonedTask).then(function (clonedTask) {
                console.debug('cloning task.id: ' + task.id + ' as task.id: ' + clonedTask.id);
                tasks.push(clonedTask);
            });
            e.stopPropagation();
        };

        task.getReports = function () {
            task.reports = Restangular.one('tasks', task.id).all('reports').getList().$object;
        };

        return task;
    });

    function _createTask() {
        return {
            id: guid(),
            name: '',
            source: {
                name: 'Source',
                host: ''
            },
            destination: {
                name: 'Destination',
                host: ''
            },
            schedule: {
                time: '0 * * * *',
                enabled: false
            },
            paths: [],
            flags: []
        };
    }

    var saveTask = function (task) {
        console.debug('Saving task: ' + task.id);
        return task.put();
    };

    var removeTask = function (task) {
        console.debug('Removing task: ' + task.id);
        var index = tasks.indexOf(task);
        tasks.splice(index, 1);
        return task.remove();
    };

    return {
        tasks: tasks,
        saveTask: saveTask,
        removeTask: removeTask,
        newTask: function () {
            var task = _createTask();
            return tasks.post(task).then(function (task) {
                console.debug('Adding task.id: ' + task.id);
                tasks.push(task);
            });
        }
    };
};
