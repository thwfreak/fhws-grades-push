'use strict';

var request = require('request'),
    async = require('async');

async.waterfall([
    function getAuthToken(cb) {
        var jar = request.jar();

        if(!process.env.FHWS_USERNAME) {
            return cb(new Error('Unable to authenticate: FHWS_USERNAME empty'));
        }
        if(!process.env.FHWS_PASSWORD) {
            return cb(new Error('Unable to authenticate: FHWS_PASSWORD empty'));
        }
        if(!process.env.PUSHOVER_TOKEN) {
            return cb(new Error('Unable to start: PUSHOVER_TOKEN empty'));
        }
        if(!process.env.PUSHOVER_USER) {
            return cb(new Error('Unable to start: PUSHOVER_USER empty'));
        }

        request.post({
            uri: 'https://studentenportal.fhws.de/login/authenticate',
            followRedirect: true,
            jar: jar,
            form: {
                username: process.env.FHWS_USERNAME,
                password: process.env.FHWS_PASSWORD
            }
        }, function(err, response, body) {
            if(err) {
                cb(err);
            }
            else if(response.statusCode === 302) {
                cb(null, jar);
            }
            else {
                cb(new Error('Unable to authenticate: ' + body));
            }
        });
    },
    function getGradesHTML(jar, cb) {
        request.get({
            uri: 'https://studentenportal.fhws.de/grades',
            jar: jar
        }, function(err, response, body) {
            if(err) {
                return cb(err);
            }

            cb(null, body);
        });
    },
    function parseHTML(html, cb) {
        var cheerio = require('cheerio'),
            regex = /exams_([\dWS]+)/,
            $ = cheerio.load(html),
            result = {},
            $semester,
            semester,
            $module,
            moduleId;

        $('.panel-group').each(function() {
            $semester = $(this);
            semester = regex.exec($semester.attr('id'))[1];

            $semester.find('.panel-default').each(function() {
                $module = $(this);
                moduleId = $module.find('.panel-title table td:nth-child(1)').text().trim();

                result[moduleId] = {
                    id: moduleId,
                    title: $module.find('.panel-title table td:nth-child(2)').text().trim(),
                    grade: $module.find('.panel-title table td:nth-child(4) span').text().trim(),
                    semester: semester
                };
            });
        });

        cb(null, result);
    },
    function loadLastResult(now, cb) {
        var fs = require('fs'),
            old = [];

        fs.readFile(__dirname + '/result.json', function(err, data) {
            if(err) {
                console.warn(err.toString());
            }else {
                try {
                    old = JSON.parse(data);
                }
                catch(err) {
                    console.warn(err.toString());
                }
            }

            cb(null, old, now);
        });
    },
    function prepareNotifications(old, now, cb) {
        var _ = require('underscore'),
            notifications = [];

        // compare now with old entries
        _.each(now, function(n) {

            // new module!
            if(!old[n.id]) {
                notifications.push('Grade for "' + n.title + '": ' + n.grade);
            }

            // update?
            if(old[n.id] && n.grade !== old[n.id].grade) {
                notifications.push('Grade for "' + n.title + '" updated from ' + old[n.id].grade + ' to ' + n.grade);
            }
        });

        cb(null, now, notifications);
    },
    function saveResults(now, notifications, cb) {
        var fs = require('fs');

        fs.writeFile(__dirname + '/result.json', JSON.stringify(now, null, '    '), function(err) {
            if(err) {
                console.warn(err.toString());
            }
        });

        // don't wait
        cb(null, notifications);
    },
    function sendNotifications(notifications, cb) {
        var Pushover = require('node-pushover-client'),
            pushNotification;

        if(notifications.length === 0) {
            return cb();
        }

        pushNotification = new Pushover({
            token: process.env.PUSHOVER_TOKEN,
            user: process.env.PUSHOVER_USER
        });

        notifications.forEach(function(message) {
            pushNotification.send({
                title: 'FHWS',
                message: message,
                url: 'https://studentenportal.fhws.de/grades',
                urlTitle: 'Portal',
                sound: 'magic'
            });
        });
    }
], function(err) {
    if(err) {
        console.error(err);
    }
});
