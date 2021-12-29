"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const twitter_api_v2_1 = __importDefault(require("twitter-api-v2"));
const config = require("../config.js");
let user = {
    codeVerifier: null,
    sessionState: null
};
const client = new twitter_api_v2_1.default({
    clientId: config.TWITTER_CLIENT_ID,
    clientSecret: config.TWITTER_CLIENT_SECRET,
});
const fastify = (0, fastify_1.default)({
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
fastify.get("/", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    reply.view("home.ejs");
}));
fastify.get("/requestToken", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const { url, codeVerifier, state } = yield client.generateOAuth2AuthLink('http://127.0.0.1:3000/callback', {
        scope: ['tweet.read', 'users.read', 'offline.access']
    });
    user = { codeVerifier, sessionState: state };
    console.log(url);
    reply.redirect(url);
}));
fastify.get("/callback", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const { state, code } = request.query;
    let { codeVerifier, sessionState } = user;
    console.log("User object");
    console.log(user);
    console.log("Request object");
    console.log(request.query);
    if (!codeVerifier || !code || !state || !sessionState)
        return reply.code(400).send('User denied the access...');
    if (state != sessionState)
        return reply.code(400).send('Stored tokens don\'t match');
    return client.loginWithOAuth2({ code, codeVerifier, redirectUri: 'http://127.0.0.1:3000/callback' })
        .then(({ client: loggedClient, accessToken, refreshToken }) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(loggedClient);
        reply.send(yield loggedClient.v2.me());
    }))
        .catch(err => {
        console.log(err);
        reply.send(err);
    });
}));
// Listen on port 3000
fastify.listen(3000, () => console.log("Running on port 3000..."));
