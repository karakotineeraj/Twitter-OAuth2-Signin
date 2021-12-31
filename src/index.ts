import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import { PointOfViewOptions } from 'point-of-view';
import TwitterApi from 'twitter-api-v2';

const config = require("../config.js");

interface IQuerystring {
	state: string;
	code: string;
}

type User = {
	codeVerifier?: null | string;
	sessionState?: null | string;
	accessToken?: null | string;
	refreshToken?: null | string;
}

const user: User = {
	codeVerifier: null,
	sessionState: null,
	accessToken: null,
	refreshToken: null
};

let logClient: any;

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
	const client = new TwitterApi({
		clientId: config.TWITTER_CLIENT_ID,
	});

	const { url, codeVerifier, state } = await client.generateOAuth2AuthLink('http://127.0.0.1:3000/callback', {
		scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access']
	});

	user.codeVerifier = codeVerifier,
	user.sessionState = state;
	// console.log(url);

	reply.redirect(url);
})

fastify.get<{ Querystring: IQuerystring }>("/callback", async (request, reply) => {
	const { state, code } = request.query;
	let { codeVerifier, sessionState } = user;

	const client = new TwitterApi({
		clientId: config.TWITTER_CLIENT_ID,
	});

	if(!codeVerifier || !code || !state || !sessionState) 
		return reply.code(400).send('User denied the access...');

	if(state != sessionState)
		return reply.code(400).send('Stored tokens don\'t match');

	return client.loginWithOAuth2({ code, codeVerifier, redirectUri: 'http://127.0.0.1:3000/callback'})
	.then(async ({client, accessToken, refreshToken}) => {
		user.accessToken = accessToken;
		user.refreshToken = refreshToken;

		logClient = client.v2;	
		reply.redirect('/tweet');
	})
	.catch(err => {
		console.log(err);
		reply.send(err)
	});
});

fastify.get("/tweet", async (request, reply) => {
	await logClient.tweet("Things are looking grim around here...");

	reply.redirect("/");
})

// Listen on port 3000
fastify.listen(3000, () => console.log("Running on port 3000..."));