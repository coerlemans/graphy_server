const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');

const app = express();

// Security headers (also removes X-Powered-By)
app.use(helmet());
app.disable('x-powered-by');

// Rate limiting (prevents resource exhaustion / DoS)
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

app.use(cookieParser());
const parseForm = express.urlencoded({ extended: false });

// Session: secret from environment instead of hardcoded
const sessionConfig = {
  secret: process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex'),
  name: 'graphy',
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'strict',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
};
app.use(session(sessionConfig));

// CSRF protection
const csrfProtect = csrf({ cookie: { httpOnly: true, sameSite: 'strict' } });

app.get('/form', csrfProtect, function (req, res) {
  res.json({ csrfToken: req.csrfToken() });
});

app.post('/posts/create', parseForm, csrfProtect, function (req, res) {
  res.send('data is being processed');
});

const { URLSearchParams } = require('url');
global.URLSearchParams = URLSearchParams;

let rawdata = fs.readFileSync('UScities.json');
let USCities = JSON.parse(rawdata);

// GraphQL schema
let schema = buildSchema(`
    type Query {
        city(name: String): City
        cities(state: String): [City]
    },
    type City {
        city: String
        state: String
    }
`);

let getCity = function (args) {
  return USCities.find(city => city.city === args.name);
};

let getCities = function (args) {
  if (args.state) {
    return USCities.filter(city => city.state === args.state);
  }
  return USCities;
};

var root = {
  city: getCity,
  cities: getCities
};

app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: process.env.NODE_ENV !== 'production'
}));

app.get('/', (req, res) => {
  res.send('Copy the URL from the address-bar, to paste in Postman to use GraphQL');
});

app.listen(4000, () => console.log('Express GraphQL Server Now Running On port 4000/graphql'));
