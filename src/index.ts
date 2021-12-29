import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import { PointOfViewOptions } from 'point-of-view';
import TwitterApi from 'twitter-api-v2';

const config = require("../config.js");

interface IQuerystring {
	state: string;
	code: string;
}

type User = {
	codeVerifier: null | string;
	sessionState: null | string;
}

let user: User = {
	codeVerifier: null,
	sessionState: null
};

const client = new TwitterApi({
	clientId: config.TWITTER_CLIENT_ID,
	clientSecret: config.TWITTER_CLIENT_SECRET,
});

const fastify = Fastify({
	logger: true
});

fastify.register(require("point-of-view"), {
	engine: {
		ejs: require("ejs"),
	},
	root: `${config.ROOT_DIR}/templates/`
});

fastify.register(require('fastify-static'), {
	root: `${config.ROOT_DIR}/public`,
	prefix: "/public/",
});

fastify.get("/", async (request, reply) => {
	reply.view("home.ejs");
});

fastify.get("/requestToken", async (request, reply) => {
	const { url, codeVerifier, state } = await client.generateOAuth2AuthLink('http://127.0.0.1:3000/callback', {
		scope: ['tweet.read', 'users.read', 'offline.access']
	});

	user = { codeVerifier, sessionState: state};
	console.log(url);

	reply.redirect(url);
})

fastify.get<{ Querystring: IQuerystring }>("/callback", async (request, reply) => {
	const { state, code } = request.query;
	let { codeVerifier, sessionState } = user;

	console.log("User object");
	console.log(user);

	console.log("Request object");	
	console.log(request.query);

	if(!codeVerifier || !code || !state || !sessionState) 
		return reply.code(400).send('User denied the access...');

	if(state != sessionState)
		return reply.code(400).send('Stored tokens don\'t match');

	return client.loginWithOAuth2({ code, codeVerifier, redirectUri: 'http://127.0.0.1:3000/callback'})
	.then(async ({client: loggedClient, accessToken, refreshToken}) => {
		console.log(loggedClient);
		reply.send(await loggedClient.v2.me());
	})
	.catch(err => {
		console.log(err);
		reply.send(err)
	});


});



// Listen on port 3000
fastify.listen(3000, () => console.log("Running on port 3000..."));