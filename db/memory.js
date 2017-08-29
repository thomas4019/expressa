var randomstring = require("randomstring");
var dotty = require('dotty')
var filtr = require("filtr")

function orderBy (data, orderby) {
  data.sort(function compare (a, b) {
    for (var i = 0; i < orderby.length; i++) {
      var ordering = orderby[i]
      var key = ordering[0]
      if (dotty.get(a, key) > dotty.get(b, key)) {
        return ordering[1]
      } else if (dotty.get(a, key) < dotty.get(b, key)) {
        return -ordering[1]
      }
    }
    return 0
  })
  return data
}

module.exports = (function (settings, collection) {
  var store = {};

  return {
    init: function () {},
    all: function () {
      var arr = Object.keys(data).map(function (id) {
        return store[id];
      });
      return Promise.resolve(arr);
    },
    find: function (query, offset, limit, orderby) {
      var arr = Object.keys(store).map(function (id) {
        return store[id];
      });
      var filter = new filtr(query);
      var matches = filter.test(arr)
      if (typeof offset != 'undefined' && typeof limit != 'undefined') {
        matches = matches.slice(offset, offset + limit)
      } else if (typeof offset != 'undefined') {
        matches = matches.slice(offset)
      } else if (typeof limit != 'undefined') {
        matches = matches.slice(0, limit)
      }
      if (orderby) {
        matches = orderBy(matches, orderby)
      }
      return Promise.resolve(matches);
    },
    get: function (id) {
      if (store[id]) {
        return Promise.resolve(store[id])
      } else {
        return Promise.reject({
          message: 'no document with the id exists.'
        })
      }
    },
    create: function (data) {
      var id = typeof data._id == 'undefined' ? randomstring.generate(8) : data._id;
      data['_id'] = id
      store[id] = data
      return Promise.resolve(id)
    },
    update: function (id, data) {
      store[id] = data
      return Promise.resolve()
    },
    delete: function (id) {
      delete store[id]
      return Promise.resolve()
    }
  };
});
