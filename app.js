const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "userData.db");
const app = express();
app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => console.log("Server started"));
  } catch (e) {
    db.send(`Database error : {e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const validPassword = (password) => {
  return password.length > 4;
};

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectQuery);

  if (dbUser === undefined) {
    const userQuery = `INSERT INTO 
        user (username, name , password , gender, location)
        VALUES
        (
       '${username}',
       '${name}',
       '${password}',
       '${gender}',
       '${location}'
            )`;
    if (validPassword(password)) {
      await db.run(userQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    let isPassword = await bcrypt.compare(password, dbUser.password);
    if (isPassword === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatched === true) {
      if (validPassword(newPassword)) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updateUserQuery = `UPDATE user
            SET password = '${hashedPassword}'
            WHERE username = ${username};`;
        const user = await db.run(updateUserQuery);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});
module.exports = app;
