var runningInBrowser = !(typeof window === 'undefined') || !(typeof webWorker === 'undefined');
if (runningInBrowser) {
  module = {exports: {}};
} else {
  var _ = require('lodash');
}

// Abstraction for callback communication over sockets
stream = function(setIn, outCallback, opts) {
  opts = opts || {}; // Can log time lengths for callbacks

  var listeners = {};
  var lastCallbackNum = 0;
  var that = this;
  this.send = function(label, data, opt_callback, opt_idCallback) {
    lastCallbackNum++;
    if (_.isFunction(data)) {
      // Can skip the data field if no interesting data to send
      opt_callback = data;
      data = {};
    }

    if (opt_idCallback != null) opt_idCallback(lastCallbackNum);
    if (opt_callback != null) listeners[lastCallbackNum] = [{callback: opt_callback, sendTime: performance.now()}];

    if (_.isFunction(label)) {
      label(data);
    } else {
      outCallback({
        label: label,
        data: data,//JSON.stringify(data),
        callbackNum: opt_callback != null ? lastCallbackNum : null
      }); 
    }
  };

  this.listen = function(label, callback) {
    listeners[label] = listeners[label] || [];
    listeners[label].push({callback: callback});
  }

  setIn(function(message) {
    if (listeners[message.label] != null) {
      for (var i = 0; i < listeners[message.label].length; i++) {
        var response = listeners[message.label][i].callback(message.data, message.callbackNum);
        if (response != null && message.callbackNum != null) {
          that.send(message.callbackNum, response);
        }
      }
    }
  });
};
module.exports.stream = stream

// extends 'from' object with members from 'to'. If 'to' is null, a deep clone of 'from' is returned
var clone2 = function(from, avoid, to) {
  avoid = avoid || {};
  if (_.isFunction(from)) return null;
  if (from == null || typeof from != "object") return from;

  if (from.constructor === Array) {
    to = to || from.slice(0);
    for (var i = 0; i < to.length; i++) {
      to[i] = clone2(to[i], avoid);
    }
  } else {
    to = to || {};
    for (var name in from) {
      if (name != null && avoid[name] == null) {
        to[name] = typeof to[name] == "undefined" ? clone2(from[name], avoid) : to[name];
      }
    }
  }

  return to;
}

var clone = function(from, avoid, to) {
  return clone2(from, avoid, to);
}
module.exports.clone = clone;

var getProp = function(that, prop) {
  return $(that).closest('[data-'+prop+']').attr('data-'+prop);
}
module.exports.getProp = getProp;

var roundToDecimals = function(num, decimals) {
  var factor = Math.pow(10,decimals);
  return Math.round(num * factor) / factor;
};

var getNewId = function(list, prefix) {
  var id = null;
  var outOf = (Object.keys(list).length + 1) * 50;

  while (id == null || list[prefix + id] != null) {
    id = Math.round(Math.random() * outOf);
  }

  return prefix + id;
}
module.exports.getNewId = getNewId;

var getParameterByName = function(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}
module.exports.getParameterByName = getParameterByName

var isDiff = function(a, b, opts) {
  opts = opts || {};
  if (opts.ignore != null) {
    // Ignore certain parameters like 'updateTime'
    var newA = {};
    for (var key in a) {
      if (opts.ignore[key] == null) newA[key] = a[key];
    }
    var newB = {};
    for (var key in b) {
      if (opts.ignore[key] == null) newB[key] = b[key];
    }
    return JSON.stringify(newA) != JSON.stringify(newB);
  }
  return JSON.stringify(a) != JSON.stringify(b);
}
module.exports.isDiff = isDiff;

var empty = function(obj) {
  return obj == null || Object.keys(obj).length == 0;
}
module.exports.empty = empty;

var formatDate = function(date, opts) {
  opts = opts || {};
  date = new Date(date);
  return (date.getMonth()+1)+'/'+(date.getDate())+ ((opts.showYear || date.getYear() != (new Date).getYear()) ? '/'+(date.getYear()+1900) : '');
};
module.exports.formatDate = formatDate;

var isProp = function(key, value) {
  return function(val) {
    return val[key] == value;
  };
}
module.exports.isProp = isProp;

var last = function(list) {
  return list[list.length - 1];
}
module.exports.last = last;

var makeId = function(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
};
module.exports.makeId = makeId;

for2 = function(opts, func, callback) {
  opts = opts || {}
  
  var done = callback || opts.done || function() {};
  var tracker = opts.track;

  if (opts.list == null) return callback;

  if (opts.list.length != null) {
    // Array
    var values = opts.list;
    var keys = range(0, opts.list.length);
  } else {
    // Obj
    var values = _.values(opts.list);
    var keys = Object.keys(opts.list);
  }

  var blockThreshold = 80; // ms

  var i = 0;
  var checkNext = function() {
    var start = performance.now();

    var stop = false;
    var wait = function() { 
      if (opts.wait != null) opts.wait(); // waiting the upper layers as well
      stop = true; 
    };
    while (i < values.length) {
      if (isDone(tracker)) return;

      // If time so far is over threshold and hasn't waited yet, start waiting
      if (!opts.block && !stop) {
        var now = performance.now();
        if (now - start > blockThreshold) {
          start = performance.now();
          wait(); // Don't introduce asynchrony without notifying super methods
          setTimeout(checkNext, 0);
          break;
        }
      }

      func(values[i], function(opts) {
        opts = opts || {};

        if (opts.break) {
          stop = true; // easy way to break a loop
          return done();
        }
        if (!stop) return; // Only works when waited first

        if (!opts.sync && !opts.block) { // Default to async to prevent stack traces overflowing
          setTimeout(checkNext, 0);
        } else {
          checkNext();
        }
      }, keys[i], wait);
      i++;

      if (stop) break;
    }

    if (i == values.length && !stop && !isDone(tracker)) done(); // Actually done
  };
  checkNext();
};
module.exports.for2 = for2;

var range = function(start, end) {
  var list = [];
  for (var i = start; i < end; i++) list.push(i);
  return list;
}
module.exports.range = range;

var trackerCount = {};
var getTracker = function(title, opts) {
  opts = opts || {};

  if (trackerCount[title] == null) trackerCount[title] = 0;

  var tracker = {
    start: trackerCount[title],
    title: title,
    conditions: opts.conditions || []
  }

  tracker.step = function() {
    trackerCount[title]++;
    return getTracker(title);
  };

  return tracker;
}
module.exports.getTracker = getTracker;

var isDone = function(tracker) {
  return tracker != null && (trackerCount[tracker.title] > tracker.start || tracker.conditions.some(isDone));
};
module.exports.isDone = isDone;

var getType = function(id) {
  if (id == null) return;
  if (id.slice(0, 1) == 'u') return 'user';
  if (id.slice(0, 1) == 'd') return 'disease';
}
module.exports.getType = getType;

var numKeys = function(obj) {
  return Object.keys(obj).length;
}
module.exports.numKeys = numKeys;

var keys = Object.keys;

var getListByType = function(type) {
  var list = [];
  if (type == 'user') { list = users } 
  else if (type == 'disease') { list = diseaseList } 
  return list;
}
module.exports.getListByType = getListByType;

var get = function(id) {
  var type = getType(id);
  var list = getListByType(type);
  return list[id];
};
module.exports.get = get;

var getHash = function(txt) {
  return CryptoJS.MD5(txt + '_meet').toString()
};
module.exports.getHash = getHash;

var fixLink = function(url) {
  return !/^https?:\/\//i.test(url) ? 'http://' + url : url;
}
module.exports.fixLink = fixLink

var setMaxHeight = function(element) {
  var headerBox = $(element+' .modal-header').length != 0 ? $(element+' .modal-header')[0].getBoundingClientRect() : {height: 0, top: 0};
  var footerBox = $(element+' .modal-footer').length != 0 ? $(element+' .modal-footer')[0].getBoundingClientRect() : {height: 20};
  var maxHeight = $(element+'').height() - (Math.max(headerBox.top, 10) + headerBox.height + footerBox.height + 20);
  $(element+' .modal-body').css('max-height', maxHeight);
};
module.exports.setMaxHeight = setMaxHeight;

