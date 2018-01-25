const Hapi = require('hapi')
const Joi = require('joi')

const contacts = []

const server = Hapi.server({
    host: 'localhost',
    port: 8000,
    routes: {
        validate: {
            // https://github.com/hapijs/hapi/issues/3706
            failAction: async (request, h, err) => {
                if (process.env.NODE_ENV === 'production') {
                    // In prod, log a limited error message and throw the default Bad Request error.
                    console.error('ValidationError:', err.message) // Better to use an actual logger here.
                    throw Boom.badRequest(`Invalid request payload input`)
                } else {
                    // During development, log and respond with the full error.
                    console.error(err)
                    throw err
                }
            },
        },
    },
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
    config: {
        validate: {
            params: {
                name: Joi.string()
                    .alphanum()
                    .min(3)
                    .max(30)
                    .required(),
            },
        },
    },
})

server.route({
    method: 'GET',
    path: '/contacts',
    handler(request, h) {
        return h.response({ contacts }).code(201)
    },
})

server.route({
    method: 'POST',
    path: '/contacts',
    config: {
        validate: {
            payload: Joi.object({
                contact: Joi.object({
                    name: Joi.string().required(),
                    surname: Joi.string().required(),
                }).required(),
            }),
        },
    },
    handler(request, h) {
        const contact = request.payload.contact
        contacts.push(contact)
        return { contact }
    },
})

server.route({
    method: 'GET',
    path: '/search',
    handler(request, h) {
        return request.query
    },
    config: {
        validate: {
            query: {
                text: Joi.string().required(),
                pageNumber: Joi.number().default(1),
                lang: Joi.only(['pl', 'gb']).default('pl'),
            },
        },
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
