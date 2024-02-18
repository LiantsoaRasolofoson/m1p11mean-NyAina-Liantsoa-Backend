var dbConfig = require("../config/db.config.js");
var mongoose = require("mongoose");

mongoose.Promise = global.Promise

const db = {};
db.mongoose = mongoose;
db.uri = dbConfig.uri;

db.user = require("./user.model.js");
db.role = require("./role.model.js");
db.service = require("./service.model.js");
db.serviceEmployee = require("./serviceEmployee.model.js");


db.ROLES = ["user", "employee", "admin"]

module.exports = db;
