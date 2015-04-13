var pg = require('pg');
var nconf = require('nconf');
var express = require('express');
var app = express();

//load variables
nconf
  .argv()
  .env()
  .file({file:'./config.json'});


var oauth2 = require('simple-oauth2')({
  clientID: nconf.get('AUTOMATIC_CLIENT_ID'),
  clientSecret: nconf.get('AUTOMATIC_CLIENT_SECRET'),
  site: 'https://accounts.automatic.com',
  tokenPath: '/oauth/access_token'
});


var query = 'SELECT *, ST_Distance(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 2227), geom) AS distance ' +
            'FROM sfsweeproutes ' +
            'WHERE geom && ST_Expand(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 2227), 100) ' +
            'ORDER BY distance ' +
            'LIMIT 10';

app.get('/rules', function (req, res, next) {
  pg.connect(nconf.get('PG_URL'), function(err, client, done) {
    if(err) return next(err);

    if(!req.query || !req.query.lat || !req.query.lon) {
      return res.json({error: 'No lat and lon provided'});
    }

    client.query(query, [req.query.lat, req.query.lon], function(err, result) {
      if(err) return next(err);

      done();

      var match = result.rows[0];

      res.json(match);
    });
  });
});


// Handles incoming webhooks
app.post('/webhook', function(req, res, next) {
  res.json('OK');

  if(req.body && req.body.type === 'trip:finished') {
    var lat = req.body.location.lat,
        lon = req.body.location.lon,
        time = req.body.created_at,
        userID = req.body.user.v2_id;

    //TODO: update parked status and any pending notifications for user
    //TODO: ensure time > last parked time
  }
});


// Redirects to Automatic oAuth page
app.get('/authorize', function(req, res, next) {
  res.redirect(oauth2.authCode.authorizeURL({
    scope: 'scope:user:profile scope:trip scope:location scope:vehicle:profile'
  }));
});


// Handles response from Automatic's oAuth and exchanges code for access_token
app.get('/redirect', function(req, res, next) {
  var code = req.query.code;

  oauth2.authCode.getToken({
    code: code
  }, function(err, result) {
    if(err) return next(err);

    var token = oauth2.accessToken.create(result);

    var access_token = token.token.access_token;
    var refresh_token = token.token.refresh_token;
    var user_id = token.token.user.sid;

    //TODO: store token and user_id in database
    //TODO: redirect back to app

    res.redirect('/');
  });
});


// error handlers
require('./libs/errors')(app);

app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('http://%s:%s', host, port);

});
