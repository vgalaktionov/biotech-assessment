# Coding

## Part 1

The implementation is provided in this repository, and should be runnable provided docker + docker-compose is installed and ports 80 and 5432 are available.

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

# Architecture

## Part 1

My design considerations would be:

- The complete algorithm must be able to be provided at runtime, meaning we need either a DSL or a programming language
- The users are likely to be domain experts, and proficient in either Python or R
- The barrier to entry must be low beyond basic programming knowledge,
  so we want to expose a GUI
- From a security point of view, running the user code outside of a sandbox would be undesirable

Given these considerations, a possible architecture would be one inspired by e.g. CodeWars:

- A web backend providing persistence through some kind of datastore, as well as a docker client
- A pool of worker nodes that are setup as docker hosts
- A web backend, providing users with the ability to input data, as well as a javascript-based code editor for R, Python or any other language(ACE, CodeMirror or similar).
  The entered code would be persisted in the backend.
- Upon user trigger, the user provided algorithm (in the form of a script operating on i.e. stdin and writing to stdout) would be executed inside a prebuilt docker container on one of the docker hosts with all necessary dependencies, with the input data provided on stdin
- The result of the job would then be persisted in the backend and displayed to the user in the frontend

Essentially, the backend is pretty much evaluating user code as a lambda.
Therefore, this part could be implemented using off-the-shelf serverless solutions like AWS Lambda, simplifying the implementation.

## Part 2

My first steps would be further requirements gathering on what kind of application is needed (desktop, web, ETL) or similar.
This would inform further architecture choices, and allow to define some sort of high level tests like BDD.
Furthermore, I would need to know what functionality must be built-in and what must be provided/overridden through plugins.
After sketching out the design and reviewing it with a colleague, I would then proceed with the initial implementation.

Some possible options for implementations would be as follows.

#### JVM based (classpath scanning)

The wording "module" leads me to assume the plugin writers would be fairly technical.
Chances are, they would know one or multiple JVM languages (Java, Scala, Kotlin, Groovy, Clojure, JRuby).
The choice of the JVM would therefore provide a lot of flexibility for the plugin writers.
On the other hand, we have the ability to enforce a strongly typed interface for plugins, and fail fast (or fall back to defaults) if it is not met.

Java provides strong support for loading .jars at runtime, so the compiled code would only need to be placed on the classpath of the running application.
A fairly complete library for this purpose exists in PF4J, but is also not too difficult to implement manually with Spring.

While building the application, the plugin extension points would be `@Bean`s defined in terms of an interface that must be implemented by the plugin authors.
Where necessary, default implementations may be provided, and loading preference can be expressed in terms of e.g. `@Conditional` annotations.
When extensible functionality is triggered, the application would locate the appropriate interface implementation and run it.
If the overhead of classpath scanning is large, this could also be made to run in the background on a timer/filesystem notifications.

#### Container Orchestration + Service Discovery

It may be that something like the JVM based solution is not flexible enough.
In that case, the plugins may be defined as HTTP services (or protobuf, etc.) exposing a pre-defined API.
The contract specification would be defined using Swagger.
To add a new plugin, a new container/pod would be deployed using the chosen orchestration stack (Nomad/Consul, Marathon/Mesos, Kubernetes).
The URI for this plugin would then be picked up by the service discovery mechanism, and the main application would be able to query for this.

When plugin functionality is accessed, the main application would then query for possible plugin URIs, and interact with the highest-priority one through REST according to the Swagger specification.

This approach provides great flexibility, but also many drawbacks.
In particular, the bar for contribution is raised from 'basic programming skills' to 'knowledge of modern container architecture and devops practices'.
Furthermore, it would also incur network overhead, and a plugin that incorrectly implements the interface would be only discovered on usage (instead of on plugin loading).
Unless the additional flexibility is necessary, I would hesitate about this approach.

#### Workflow System (Airflow/Luigi)

In case the application fits into the general ETL mold, an off-the-shelf solution may be used.
In that case, the pipeline would include steps that scan certain directories on the server for user plugins, and execute the appropriate ones.
Writing a plugin would then only mean transferring a script to the server, although failures here will also occur at runtime and must be isolated.
