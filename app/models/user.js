var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');


var User = db.Model.extend({
  tablename: 'users',
  initialize: function() {
    this.on('create', this.hashPassword, this);
  },
  hashPassword: function(model, attr, options) {
    return new Promise(function(resolve, reject) {
      bcrypt.genSalt(10, function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    })
    .then(function(salt) {
      return new Promise(function(resolve, reject) {
        bcrypt.hash(model.attributes.password, salt, function(err, hash) {
          if (err) {
            reject(err);
          } else {
            model.set('password', hash);
            model.set('salt', salt);
            resolve(hash);
          }
        });
      });
    })
    .catch(console.log.bind(console));
  }
});

module.exports = User;