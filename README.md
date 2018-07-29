# FHWS Grades Push

[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Status](https://git-badges.sebbo.net/35/master/build)](https://git.sebbo.net/fhws/grades-push/pipelines)

Small script to get notified when there're new grades available on the 
"[FHWS Studenten Portal](https://studentenportal.fhws.de/grades)". Uses 
ugly HTML scraping and there's almost no error handling, deal with it. 
Very untested. Such wow.

### Installation

#### Directly

You'll need [node.js](https://nodejs.org/en/) to run this.

```bash
git clone https://github.com/sebbo2002/fhws-grades-push.git
cd ./fhws-grades-push
npm install
```

I use crontab to run this script regularly.


#### Docker

You can also use the docker container to run this script:

```bash
docker build -t fhws-grades-push .
docker run -t -e FHWS_USERNAME=k***** -e FHWS_PASSWORD=***** -e PUSHBULLET_ACCESS_TOKEN=***** -v /opt/fhws-grades-push/result.json:/app/result.json fhws-grades-push
```


### Configuration

Use environment variables to set login credentials and pushover tokens:

<table>
    <tr>
        <th scope="row">FHWS_USERNAME</td>
        <td>Your username for the "FHWS Studenten Portal"</td>
    </tr>
    <tr>
        <th scope="row">FHWS_PASSWORD</td>
        <td>Your password for the "FHWS Studenten Portal"</td>
    </tr>
    <tr>
        <th scope="row">PUSHBULLET_ACCESS_TOKEN</td>
        <td>Your pushbullet access token. You can get yours <a href="https://www.pushbullet.com/">here</a>.</td>
    </tr>
</table>

### Example

```bash
FHWS_USERNAME="k*****" \
FHWS_PASSWORD="*********" \
PUSHBULLET_ACCESS_TOKEN="*********" node app
```

![Such wow, much awesome](https://i.imgur.com/rSzk8wQ.png)
