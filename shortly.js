var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var bcrypt = require('bcrypt-nodejs');
var app = express();
var session = require('express-session');

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

//###Middleware###

app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({ secret: 'keyboard cat', resave: true, saveUninitialized: true, cookie: { maxAge: 60000 }}));

//###End middleware###

var PORT = process.env.port;

var authenticate = function(username, password, cb) {
  new User({
    username: username
  })
  .fetch()
  .then(function(found) {
    found = found.attributes;
    if (found) {
      return new Promise(function(resolve, reject) {
        bcrypt.hash(password, found.salt, null, function(err, hash) {
          if (err) {
            reject(err);
          } else {
            if (hash === found.password) {
              resolve(found);
            } else {
              resolve(new Error('Login Failed.'));
            }
          }
        }); 
      })
      .then(function(found) {
        cb(null, found.username);
      })
      .catch(function(err) { cb(err); });

    } else {
      cb(err);
    }
  });
};

var restrict = function(req, res, next) {
  // console.log('checking restrict', req.session);
  console.log(req.method, ' request to', req.url);
  if (!req.session.user) {
    return res.redirect('login');
  } else {
    next();
  }
};

app.get('/', function(req, res) {
  res.render('index');
});

app.get('/login', function(req, res) {
  res.render('login');
});


app.post('/login', function(req, res) {
  authenticate(req.body.username, req.body.password, function(err, user) {
    console.log('user', user);
    if (user) {
      console.log('user logged in');
      //set a token
      req.session.regenerate(function() {
        req.session.user = user;
        res.redirect('index');
      });
    } else {
      console.log('login failed');
      res.status(404);
      res.redirect('login');
    }
  });

});

app.get('/create', restrict, function(req, res) {
  res.redirect('login');
});

app.get('/links', function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.get('/logout', function(req, res) {
  console.log('Logging out...', req.session);
  req.session.user = '';
  res.redirect('login');
});

app.post('/links', restrict, function(req, res) {  
  var uri = req.body.url;
  if (!req.session.user) {
    res.send({redirect: '/login'});
    return;
  } 
  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({
    'username': username
  })
  .fetch()
  .then(function(found) {
    if (found) {
      res.sendStatus(404);
    } else {
      new User({
        'username': username,
        'password': password
      })
      .save()
      .then(function() {
        // res.send(JSON.stringify({'username': username}));
        res.redirect('/');
      });
      // res.send(`Account ${username} successfully created!`);
    }
  });
});


  

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(PORT);
