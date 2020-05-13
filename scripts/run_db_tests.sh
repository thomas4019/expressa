docker run -d -p 5432:5432 --rm --name postgres -e POSTGRES_PASSWORD=expressa postgres
docker run -d -p 27017:27017 --rm --name mongo mongo
sleep 1
docker exec -it postgres /bin/bash -c "createdb pgtest -U postgres"
TEST_POSTGRES=true TEST_MONGO=true npm run test

docker stop postgres
docker stop mongo
