rm -rf testdata
node test/testserver.js &
pid=$!
sleep 1
./node_modules/.bin/cypress run
kill "$pid"