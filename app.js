'use strict';

var request = require('request'),
	async = require('async');

async.waterfall([
	function getAuthToken (cb) {
		var jar = request.jar();

		if (!process.env.FHWS_USERNAME) {
			return cb(new Error('Unable to authenticate: FHWS_USERNAME empty'));
		}
		if (!process.env.FHWS_PASSWORD) {
			return cb(new Error('Unable to authenticate: FHWS_PASSWORD empty'));
		}
		if (!process.env.PUSHBULLET_ACCESS_TOKEN) {
			return cb(new Error('Unable to start: PUSHBULLET_ACCESS_TOKEN empty'));
		}

		request.post({
			uri: 'https://studentenportal.fhws.de/login/authenticate',
			followRedirect: true,
			jar: jar,
			form: {
				username: process.env.FHWS_USERNAME,
				password: process.env.FHWS_PASSWORD
			}
		}, function (err, response, body) {
			if (err) {
				cb(err);
			}
			else if (response.statusCode === 302) {
				cb(null, jar);
			}
			else {
				cb(new Error('Unable to authenticate: ' + body));
			}
		});
	},
	// function switchToBachelor(jar, cb) {
	// 	request.post({
	// 		uri: "https://studentenportal.fhws.de/home/swap",
	// 		form: {
	// 			offset: '0'
	// 		},
	// 		jar: jar
	// 	}, function (err, response, body) {
	// 		if (err) {
	// 			return cb(err);
	// 		}

	// 		cb(null, jar);
	// 	});
	// },
	function getGradesHTML (jar, cb) {
		request.get({
			uri: 'https://studentenportal.fhws.de/grades',
			jar: jar
		}, function (err, response, body) {
			if (err) {
				return cb(err);
			}

			cb(null, body);
		});
	},
	function parseHTML (html, cb) {
		var cheerio = require('cheerio'),
			regex = /exams_([\dWS]+)/,
			$ = cheerio.load(html),
			result = {},
			$semester,
			semester,
			$module,
			moduleId;

		$('.panel-group').each(function () {
			$semester = $(this);
			semester = regex.exec($semester.attr('id'))[1];

			$semester.find('.panel-default').each(function () {
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
	function loadLastResult (now, cb) {
		var fs = require('fs'),
			old = [];

		fs.readFile(__dirname + '/result.json', function (err, data) {
			if (err) {
				console.warn(err.toString());
			} else {
				try {
					old = JSON.parse(data);
				}
				catch (err) {
					console.warn(err.toString());
				}
			}

			if(Object.keys(now).length < Object.keys(old).length) {
				return cb(new Error(
					'Oops, seems like they lost some grades… (were ' + Object.keys(old).length + ', ' +
					'but now only ' + Object.keys(now).length + ' found)'
				));
			}

			cb(null, old, now);
		});
	},
	function prepareNotifications (old, now, cb) {
		var _ = require('underscore'),
			notifications = [];

		// compare now with old entries
		_.each(now, function (n) {

			// new module!
			if (!old[n.id]) {
				notifications.push('Grade for "' + n.title + '": ' + n.grade);
			}

			// update?
			if (old[n.id] && n.grade !== old[n.id].grade) {
				notifications.push('Grade for "' + n.title + '" updated from ' + old[n.id].grade + ' to ' + n.grade);
			}
		});

		cb(null, now, notifications);
	},
	function saveResults (now, notifications, cb) {
		var fs = require('fs');

		fs.writeFile(__dirname + '/result.json', JSON.stringify(now, null, '    '), function (err) {
			if (err) {
				console.warn(err.toString());
			}
		});

		// don't wait
		cb(null, notifications);
	},
	function sendNotifications (notifications, cb) {
		var PushBullet = require('pushbullet');
		var pusher = new PushBullet(process.env.PUSHBULLET_ACCESS_TOKEN);

		if (notifications.length === 0) {
			return cb();
		}

		pusher.me(function (err, me) {
			if(err) {
				cb(err);
			}

			notifications.forEach(function (message) {
				pusher.link(
					me.email,
					'🎓 FHWS Grades', 
					'https://studentenportal.fhws.de/', 
					message, 
					function(error, response) {
						console.log(response);
					});
			});
		});
	}
], function (err) {
	if (err) {
		console.error(err);
	}
});
