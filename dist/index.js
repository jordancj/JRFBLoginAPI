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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 8080;
const cosmosDbUri = process.env.COSMOS_DB_URI;
const corsOptions = {
    origin: 'https://ashy-ocean-0062f3f00.5.azurestaticapps.net',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
console.log(cosmosDbUri);
if (!cosmosDbUri) {
    throw new Error('COSMOS_DB_URI is not defined in the environment variables.');
}
const client = new mongodb_1.MongoClient(cosmosDbUri);
client.connect().then(() => {
    const db = client.db('JRFBLogin');
    const usersCollection = db.collection('Usernames');
    app.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { username } = req.body;
            function sanitizeUsername(username) {
                const sanitized = username.trim().toLowerCase();
                if (sanitized.length < 3 || sanitized.length > 20) {
                    throw new Error('Invalid username length. Must be between 3 and 20 characters.');
                }
                if (/^[a-z.]+$/.test(sanitized)) {
                    return sanitized;
                }
                throw new Error('Invalid username. Only letters and full stops are allowed');
            }
            const sanitizedUsername = sanitizeUsername(username);
            console.log(sanitizedUsername);
            const user = yield usersCollection.findOne({ username: sanitizedUsername });
            if (user) {
                res.status(200).json({ success: true });
            }
            else {
                res.status(401).json({ success: false, message: 'Authentication failed' });
            }
        }
        catch (error) {
            console.error('Error:', error);
            res.status(500).json({ success: false, message: 'An error occurred' });
        }
    }));
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}).catch((err) => {
    console.error('Failed to connect to database:', err);
});
