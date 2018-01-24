const Hapi = require('hapi')

const server = Hapi.server({
    host: 'localhost',
    port: 8000,
})

const getRandomString = () =>
    Math.random()
        .toString(36)
        .toUpperCase()
        .substr(2)

server.route({
    method: 'GET',
    path: '/hello/{name?}',
    handler(request, h) {
        const { name } = request.params

        if (name) {
            return `Hello '${encodeURIComponent(name)}' :)`
        }

        return `Hello anonymous '${getRandomString()}' :)`
    },
})

server.route({
    method: 'GET',
    path: '/search',
    handler(request, h) {
        return request.query
    },
})

const start = async () => {
    try {
        await server.start()
    } catch (err) {
        console.log(err)
        process.exit(1)
    }

    console.log('Server running at:', server.info.uri)
}

start()
