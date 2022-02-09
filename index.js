const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer')
const routes = require('./routes');

const app = express();

// default port if not specified in command line
const port = process.argv[2] || 3000;

app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

// passing multiple modules so we don't have to import them again in the routes
const mods = {
    app: app,
    multer: multer
}

routes(mods);

app.listen(port, () => {
    console.log(`App running on port ${port}.`)
});