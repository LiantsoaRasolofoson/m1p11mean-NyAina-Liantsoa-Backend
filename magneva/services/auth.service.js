const db = require("../models");
const User = db.user;
const Role = db.role;
const ROLES = db.ROLES;
const jwt = require("jsonwebtoken")
const config = require("../config/auth.config");

var bcrypt = require("bcryptjs");

const generateJWT = (user) => {
    return jwt.sign(
        {
            id: user._id,
            roles: user.roles
        },
        config.secret,
        {
            algorithm: 'HS256',
            allowInsecureKeySizes: true,
            expiresIn: 86400, // 24 hours
        });
}

const isPasswordValid = (signInPassword, userPassword) => {
    return bcrypt.compareSync(
        signInPassword,
        userPassword
    );
}

const doesUserHaveAcces = (userRoles, roleRequired) => {
    return userRoles.some(userRole => userRole.name === roleRequired);
}

const signIn = async (req, res) => {
    let data = req.matchedData;

    try {
        let user = await User.findOne({ email: data.email });
        if (!user) {
            return res.status(400).send({ error: { message: "Utilisateur pas trouvee" } });
        }

        if (!isPasswordValid(data.password, user.password)) {
            return res.status(400).send({ error: { message: "Mot de passe erronee" } });
        }

        await user.populate("roles");

        if (doesUserHaveAcces(user.roles, data.role) == false) {
            return res.status(400).send({ error: { message: "Utilisateur n'a pas le role requise" } })
        }

        let token = generateJWT(user);
        res.status(200).send({
            id: user._id,
            name: user.name,
            firstName: user.firstName,
            roles: user.roles.map((role) => role.name),
            token: token
        });

    } catch (err) {
        res.status(500).send({ error: { message: err.message } })
    }
}

const isDuplicateEmail = async (email) => {
    let user = await User.findOne({ email: email }).exec();
    return user == null ? false : true;
}

const doesRoleExist = (roles) => {
    if (roles.length == 0) {
        return false;
    }
    for (let i = 0; i < roles.length; i++) {
        if (!ROLES.includes(roles[i])) {
            return false
        }
    }
    return true;
};

const isRoleEmployee = (roles) => {
    if (roles.length === 0) {
        return false;
    }
    for (let i = 0; i < roles.length; i++) {
        if (roles[i] !== "employee") {
            return false;
        }
    }
    return true;
};

const isDateValide = (date) => {
    if (!isNaN(date)) {
        return true;
    }
    return false;
}

const signUp = async (req, res) => {
    let data = req.body;

    const user = new User({
        name: data.name,
        firstName: data.firstName,
        sex: data.sex,
        email: data.email,
        password: bcrypt.hashSync(data.password, 8),
        contact: data.contact
    });

    try {
        if (await isDuplicateEmail(user.email)) {
            return res.status(400).send({ error: "Mail deja utilise" });
        }
        if (!doesRoleExist(data.roles)) {
            return res.status(400).send({ error: "Ce role n'existe pas" })
        }
        if (isRoleEmployee(data.roles)) {
            const startDate = new Date(data.startDate);
            if (isDateValide(startDate)) {
                user.startDate = startDate;
                user.picture = data.picture;
                isReturn = true;
            }
            else {
                return res.status(400).send({ error: "Date invalide" });
            }
        }

        let roles;
        await user.save();
        roles = await Role.find({ name: { $in: data.roles } }).exec();
        user.roles = roles.map(role => role._id);
        await user.save();
        
        if (isRoleEmployee(data.roles)) {
            return user;
        }
        res.status(201).send(user);

    } catch (err) {
        res.status(400).send({ error: err.message })
    }
}

module.exports = {
    signIn,
    signUp
}