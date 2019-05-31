# Coding

## Part 1

### dna-api

> REST API for storing and searching DNA strings.

Assumptions made:

- dna string length is not bounded
- valid dna strings must be uppercase

#### Build Setup

```bash
# serve with hot reload at localhost:80
$ npm run dev

# run tests continuously
$ npm run test

# build container for production
$ npm run build:prod
```

## Part 2

In general, some basics would need to be put in place to deploy this API
to many users.
A non exhaustive list would be:

- A proper CI/CD pipeline to automatically run tests and deploy
- A proper logging and health monitoring setup, using something like the ELK stack and Grafana/Prometheus
- If the database schema is expected to change, a proper migration system needs to be put in place
- Database backups should be setup
- Some sort of authentication and authorization scheme would need to be implemented
- A reverse proxy would be put in front of the application, to allow for horizontal scaling and protect against e.g. slowloris attacks
- At least 2 instances should be deployed for availability, preferrably in different data centers

In terms of scaling up, that really depends on the anticipated/observed access patterns.

Initially I would expect database IO to be the bottleneck.
For write-heavy workloads, the following could be investigated:

- Batching multiple queries using an out-of-process queue like Redis
- If the access is such that it would benefit from sharding (eq. per user), that could be an option (needs benchmarking)
- Beyond that, it could be worthwhile to use a datastore more optimized for write-heavy workloads for persistence, such as Cassandra

For read-heavy workloads, the following could be investigated:

- Depending on user tolerance for stale data, a caching strategy could be investigated using e.g. Redis/Varnish
- Sharding as described above
- A simpler solution than sharding would be setting up read-only replicas
- Finally, a backend solution more optimized for search, such as ElasticSearch, could be implemented

In case the web layer turns out to be the bottleneck:

- With the reverse proxy/load balancer in place, the application is able to be scaled horizontally by spinning up more instances
- To save on server costs, the API could be rewritten using a high-performance backend stack, some options would be Go, Vert.x (JVM), or OpenResty (nginx/luajit)
