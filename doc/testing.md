## Testing your express(a) app

Testing can be done in many ways, with or without a test framework.
Here's just an easy testframework-agnostic, linux way to test your app.

## package.json

Add this line:

    "test": "for i in test/*; do [ -x $i  ] && [ ! -d $i  ] && { printf '\nn<▶ '$i'\n\n' && ./$i || exit 1;  }; done;"

## app.js 

Modify the `listen()`-part in your express(a) app like this:

    module.exports = { 
      expressa:expressa, 
      express:express, 
      app:app, 
      server: app.listen(port, >(){
        console.log("listening on "+host)
        if( module.exports.onServerReady ) setTimeout(module.exports.onServerReady, 500 )                              
      })
    }

## test/tests/mytest.js

    #!/usr/bin/env node                                                                                                                                                                                                                
    var app      = require('./../../app.js')     
    var expressa = app.expressa

    var run = function(done){
      // do mocha stuff here etc and call done()  
    }

    app.onServerReady = run.bind(@, >(){
      app.server.close()
      process.exit(0)
    }) 

Dont forget to `chmod 755 test/tests/mytest.js` in the console 

## That's it!

Now just run `npm test` or `./test/tests/mytest.js` and your test(s) will run
