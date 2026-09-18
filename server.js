const express = require("express");
const fs = require("fs");
const path = require("path");
const EventEmitter = require("events");

const app = express();
const PORT = 3000;

const usersFile = path.join(__dirname, "users.json");
const auditFile = path.join(__dirname, "audit.log");

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// -------------------------
// File helper functions
// -------------------------

function readUsers() {
    try {
        const data = fs.readFileSync(usersFile, "utf8");
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// -------------------------
// EventEmitter
// -------------------------

const userEvents = new EventEmitter();

userEvents.on("signup", (user) => {
    const timestamp = new Date().toISOString();

    const message =
        `[${timestamp}] SIGNUP: ${user.name} (${user.email})\n`;

    fs.appendFileSync(auditFile, message);
});

userEvents.on("login", (user) => {
    const timestamp = new Date().toISOString();

    const message =
        `[${timestamp}] LOGIN: ${user.name} (${user.email})\n`;

    fs.appendFileSync(auditFile, message);
});

// -------------------------
// Sign Up
// -------------------------

app.post("/signup", (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "All fields are required."
        });
    }

    const users = readUsers();

    const existingUser = users.find(
        user => user.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
        return res.status(409).json({
            success: false,
            message: "Email is already registered."
        });
    }

    const newUser = {
        name,
        email,
        password
    };

    users.push(newUser);
    saveUsers(users);

    // Trigger signup event
    userEvents.emit("signup", newUser);

    res.status(201).json({
        success: true,
        message: "Account created successfully."
    });
});

// -------------------------
// Login
// -------------------------

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required."
        });
    }

    const users = readUsers();

    const user = users.find(
        user =>
            user.email.toLowerCase() === email.toLowerCase() &&
            user.password === password
    );

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password."
        });
    }

    // Trigger login event
    userEvents.emit("login", user);

    res.json({
        success: true,
        message: "Login successful.",
        name: user.name
    });
});

// -------------------------
// Start server
// -------------------------

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
