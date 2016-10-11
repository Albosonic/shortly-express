var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');


var User = db.Model.extend({
  tableName: 'users',
  initialize: function() {
    this.on('creating', this.hashPassword, this);
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
        bcrypt.hash(model.attributes.password, salt, null, function(err, hash) {
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
    .catch(function(err) { console.log('OOPS', err); });
  }
});

module.exports = User;