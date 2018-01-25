const Hapi = require('hapi')
const Joi = require('joi')
const Inert = require('inert')
const Vision = require('vision')
const HapiSwagger = require('hapi-swagger')

const PACKAGE = require('../package')

const contacts = []

const swaggerConfig = {
    plugin: HapiSwagger,
    options: {
        info: {
            title: PACKAGE.description,
            version: PACKAGE.version,
        },
    },
}

const Contact = Joi.object({
    name: Joi.string()
        .required()
        .example('Jan')
        .description(`Contact's name`),
    surname: Joi.string()
        .required()
        .example('Kowalski')
        .description(`Contact's surname`),
}).label('Contact')

const ContactResponseSchema = Joi.object({
    contact: Contact.required(),
})
    .required()
    .label('ContactResponseSchema')

const ContactsResponseSchema = Joi.object({
    contacts: Joi.array()
        .items(Contact)
        .label('Contacts'),
})
    .required()
    .label('ContactsSchema')

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
        tags: ['api'],
        validate: {
            params: {
                name: Joi.string()
                    .alphanum()
                    .min(3)
                    .max(30),
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
    config: {
        tags: ['api'],
        description: 'Returns added contacts',
        response: {
            status: {
                200: ContactsResponseSchema.example({
                    contacts: [
                        { name: 'Jan', surname: 'Kowalski' },
                        { name: 'Daniel', surname: 'Nowak' },
                    ],
                }),
            },
        },
    },
})

server.route({
    method: 'POST',
    path: '/contacts',
    config: {
        tags: ['api'],
        description: 'Create a new contact',
        notes: 'Returns created contact',
        plugins: {
            'hapi-swagger': {
                responses: {
                    400: {
                        description: 'Bad request',
                    },
                    409: {
                        description: 'User with given name/surname exists',
                    },
                },
            },
        },
        validate: {
            payload: ContactResponseSchema,
        },
        response: {
            status: {
                201: ContactsResponseSchema.description('Contact created.'),
            },
        },
    },
    handler(request, h) {
        const contact = request.payload.contact
        const userExists = contacts.find(
            (c) => c.name === contact.name && c.surname === contact.surname
        )
        if (userExists) {
            return h.response('This user already exists!').code(409)
        }
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
        tags: ['api'],
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
    await server.register([Inert, Vision, swaggerConfig])

    try {
        await server.start()
    } catch (err) {
        console.log(err)
        process.exit(1)
    }

    console.log('Server running at:', server.info.uri)
}

start()
