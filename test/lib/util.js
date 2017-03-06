/* Rudimentary test tools: async unittests, modulepatch, monkeypatch & function spies
 *
 * source: https://gist.github.com/coderofsalvation/9323ca2ae5f7d84cb366
 * 
 * var t = require('./test/tools.js')
 * 
 * t.patchModule('mongodb', function(require,a,b,c){              // patch a module example
 *     // optional call original()
 *     console.dir(arguments)
 *   }
 * })
 * 
 * monkeypatch( console, 'log', function(original,a,b,c){         // monkeypatch a function
 *   original.apply(this,[a,b,c])
 * }
 *
 * t.test("test foo", function(next,error){                       // add async unit tests
 *   // do stuff
 *   next() // or call error("foo")
 * })
 * t.run()                                                        // run tests
 *
 */

var t = {};

t.errors = 0;

t.error = function(msg) {
  t.errors++;
  console.error("ERROR: " + msg);
  return process.exit(1);
}

t.modulePatch = {}

t.monkeypatch = function(obj, method, handler, context) {
  var original = obj[method];

  // Unpatch first if already patched.
  if (original.unpatch) {
    original = original.unpatch();
  }

  // Patch the function.
  obj[method] = function() {
    var ctx  = context || this;
    var args = [].slice.call(arguments);
    args.unshift(original.bind(ctx));
    return handler.apply(ctx, args);
  };

  // Provide "unpatch" function.
  obj[method].unpatch = function() {
    obj[method] = original;
    return original;
  };

  // Return the original.
  return original;
};  

t.patchModule = function( modname, fn ){
  t.modulePatch[modname] = fn 
}

t.spy = function(fn) {
  if (!fn) fn = function() {};

  function proxy() {
    var args = Array.prototype.slice.call(arguments);
    proxy.calls.push(args);
    proxy.called = true;
    fn.apply(this, args);
  }

  proxy.prototype = fn.prototype;
  proxy.calls = [];
  proxy.called = false;

  return proxy;
}

t.tests = [];

t.test = function(description, cb) {
  return t.tests.push({
    description: description,
    cb: cb
  });
};

t.run = function(cb) {
  var i, next;
  i = 0;
  output = function (msg,i){
    if( msg ) console.log('\x1b[33m',"\n"+i+") " + msg, '\x1b[0m' );
  }
  next = function() {
    if (t.tests[++i] != null) {
      output(t.tests[i].description,i+1)
      return t.tests[i].cb(next, t.error);
    }
  };
  t.test("", function(){
    console.log("\nerrors: "+t.errors)
    console.log("health: "+ (t.errors > 0 ? "FAILED": "OK") )
		if( cb ) cb()
  })
  output(t.tests[i].description,i+1)
  return t.tests[i].cb(next,t.error);
};


// patch require()             
t.monkeypatch( require('module').prototype,'require', function(original, modname ){
  for( var i in t.modulePatch ) 
    if( modname == i ) 
      return t.modulePatch[i].bind(original)
  return original(modname)
})

module.exports = t
