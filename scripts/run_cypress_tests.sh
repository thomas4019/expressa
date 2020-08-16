rm -rf testdata
node test/testserver.js &
pid=$!
sleep 1
./node_modules/.bin/cypress run --reporter junit \
  --reporter-options "mochaFile=results/cypress-[hash].xml,toConsole=true"
kill "$pid"