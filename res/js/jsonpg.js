var jsonpg = {};

// var domain = 'localhost:1002';
var domain = 'jsonpg.herokuapp.com';

var proxy = function(url) {
  return 'https://medmap.tech/proxy?url=' + encodeURIComponent(url);
  // return url;

  // return 'http://localhost:3301/proxy?url=' + encodeURIComponent(url);
}

var splitPath = function(path) {
  return path.split('[').join('.[').split('.');
};

var joinPath = function(pathList) {
  return pathList.filter(function(item) {return item != ''}).join('.').split('.[').join('[');
}

var getParams = function(params) {
  return Object.keys(params).map(function(key) {
    return (params[key] != null && params[key] != '')? key + '=' + encodeURIComponent(params[key]) : '';
  }).filter(function(param) { return param.length > 0}).join('&');
}

jsonpg.setKey = function(username, key) {
  jsonpg.username = username;
  jsonpg.key = key;
};

jsonpg.getKey = function(callback) {
  callback = callback || function() {};
  var loginWindow = window.open('http://'+domain+'/login', 'JSON Playground Login', 'height=400,width=350');

  var formConnection = setInterval(function(){
    loginWindow.postMessage('Hello!', '*');
  }, 1000);

  window.addEventListener('message',function(event) {
    // if (event.origin !== 'http://scriptandstyle.com') return;
    console.log('received response:  ', event.origin, event.data);
    clearInterval(formConnection);

    if (event.data.data != null) {
      callback(event.data.username, event.data.key);
      console.log('got key', event.data.username, event.data.key);
    }
  }, false);
};

jsonpg.onChange = function(opts, callback) {
  callback = callback || function() {};
  var frequency = opts.frequency != null ? opts.frequency : 500;

  var pathList = splitPath(opts.path);
  var lastWatch = 0;

  var check = function() {
    $.getJSON(proxy('http://'+domain+'/watch?'+getParams({path: opts.path})), function(watchNum) {
      if (watchNum > lastWatch) {
        lastWatch = watchNum;
        callback();
        setTimeout(check,frequency);
      } else {
        setTimeout(check,frequency);          
      }
    });
  };
  setTimeout(check,frequency);
}

jsonpg.watch = function(opts, callback) {
  callback = callback || function() {};
  jsonpg.onChange({
    path: opts.path,
    frequency: opts.frequency
  }, function() {
    jsonpg.get(opts.path, callback)
  })
};

jsonpg.watchInbox = function(opts, callback) {
  callback = callback || function() {};
  var frequency = opts.frequency != null ? opts.frequency : 500;

  var lastNum = 0;
  jsonpg.getNum(opts.username + '.inbox', function(num) {
    lastNum = num;
    jsonpg.watch({
      path: opts.username + '.inbox',
      frequency: opts.frequency
    }, function() {
      jsonpg.getNum(opts.username + '.inbox', function(num) {
        if (num <= 0 || num <= lastNum) return;

        lastNum = num;

        // go through lastNum to num and get all data;
        debugger;

        jsonpg.get(opts.username + '.inbox['+num+']', function(latest) {
          console.log(data);
          callback(data);
        })
      })
    })
  });
};

jsonpg.get = function(path, callback) {
  callback = callback || function() {};
  var pathList = splitPath(path);
  var postUserPath = joinPath(pathList.slice(1));
  var url = 'http://'+domain+'/'+pathList[0]+'/get?'+getParams({path: postUserPath, username: jsonpg.username, key: jsonpg.key});
  $.getJSON(proxy(url), function(result) {
    if (result == 'error') debugger
    callback();
  });
};

jsonpg.set = function(path, data, callback) {
  callback = callback || function() {};
  var pathList = splitPath(path);
  var postUserPath = joinPath(pathList.slice(1));
  var url = 'http://'+domain+'/'+pathList[0]+'/set?'+getParams({path: postUserPath, username: jsonpg.username, key: jsonpg.key, data: JSON.stringify(data)});
  $.getJSON(proxy(url), function(result) {
    if (result == 'error') {
      console.log(url);
      debugger;
    }
    callback();
  });
};

jsonpg.send = function(toUsername, title, data, callback) {
  callback = callback || function() {};
  var pathList = splitPath(path);
  var postUserPath = joinPath(pathList.slice(1));
  var url = 'http://'+domain+'/'+pathList[0]+'/set?'+getParams({username: jsonpg.username, key: jsonpg.key, to: toUsername, title: title, data: JSON.stringify(data)});
  $.getJSON(proxy(url), function(result) {
    if (result == 'error') {
      console.log(url);
      debugger;
    }
    callback();
  });
};

jsonpg.push = function(path, data, callback) {
  callback = callback || function() {};
  var pathList = splitPath(path);
  var postUserPath = joinPath(pathList.slice(1));
  var url = 'http://'+domain+'/'+pathList[0]+'/push?'+getParams({path: postUserPath, username: jsonpg.username, key: jsonpg.key, data: JSON.stringify(data)});
  $.getJSON(proxy(url), function(result) {
    if (result == 'error') {
      console.log(url);
      debugger;
    }
    callback();
  });
};

jsonpg.getNum = function(path, callback) {
  callback = callback || function() {};
  var pathList = splitPath(path);
  var postUserPath = joinPath(pathList.slice(1));
  var url = 'http://'+domain+'/'+pathList[0]+'/getNum?'+getParams({path: postUserPath, username: jsonpg.username, key: jsonpg.key});
  $.getJSON(proxy(url), function(result) {
    if (result == 'error') {
      console.log(url);
      debugger;
    }
    callback();
  });
};
