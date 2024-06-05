import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import mysql from "mysql";
import bodyParser from "body-parser";
import md5 from "md5";
import session from "express-session";
import requireLogin from "./middlewares/requireLogin.js";


const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 269999999999,
    },
  })
);

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "login",
});

app.set("view engine", "ejs");

app.use(express.static(__dirname + "/views"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/home", requireLogin, (req, res) => {
  res.render("home.ejs");
});

app.get("/", (req, res) => {
  res.render("login.ejs");
});

app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});

app.get("/user-info", requireLogin, async (req, res) => {
  return res.send({
    id_user: req.session.id_user,
    firstname: req.session.name,
    lastname: req.session.surname,
    phone: req.session.phone,
    email: req.session.Email,
    address: req.session.address,
  });
});

app.patch("/update-user-info", requireLogin, async (req, res) => {
  console.log("update-user-info");

  var firstname = req.body.firstname;
  var lastname = req.body.surname;
  var address = req.body.address;
  var email = req.body.email;
  var phone = req.body.phone;
  var id_user = req.session.id_user;


  await new Promise((resolve, reject) => {
    connection.query(
      "UPDATE credentials set name=?,surname=?,Email=?,address=?,phone=?  WHERE id_user=?",
      [firstname, lastname, email, address, phone, id_user],
      (error, result) => {
        if (error) reject(error);
        else {
          if (result.length == 0) {
            return res
              .status(200)
              .send("The user has been updated successfully");
          } else resolve(result);
        }
      }
    );
  });

  req.session.name = firstname;
  req.session.surname = lastname;
  req.session.Email = email;
  req.session.address = address;
  req.session.phone = phone;
});

app.post("/login", async (req, res) => {
  var Email = req.body.Email;
  var Password = req.body.Password;
  console.log("login");
  console.log(Email);
  console.log(Password);

  //we use md5 for the password hashing
  const hashedPassword = md5(Password);

  //checks if the user is already in the database based of Email and password
  await new Promise((resolve, reject) => {
    connection.query(
      "SELECT Email FROM credentials WHERE Email=?",
      [Email],
      (error, result) => {
        if (error) reject(error);
        else {
          if (result.length == 0) {
            return res.status(400).send("The Email is not in the database");
          } else resolve(result);
        }
      }
    );
  });

  var user = await new Promise((resolve, reject) => {
    connection.query(
      "Select * FROM credentials WHERE Email=? && pass=?",
      [Email, hashedPassword],
      (error, result) => {
        if (error) reject(error);
        else {
          if (result.length == 0)
            return res.status(400).send("Wrong credentials");
          else resolve(result);
        }
      }
    );
  });

  console.log(user[0]);
  req.session.id_user = user[0].id_user;
  req.session.name = user[0].name;
  req.session.surname = user[0].surname;
  req.session.Email = user[0].Email;
  req.session.Gender = user[0].Gender;
  req.session.address = user[0].address;
  req.session.phone = user[0].phone;

  return res.redirect("/home");
});

app.post("/signup", async (req, res) => {
  var firstname = req.body.FirstName;
  var lastname = req.body.LastName;
  var Password = req.body.Password;
  var address = req.body.Address;
  var email = req.body.Email;
  var Gender = req.body.Gender;
  var phone = req.body.Phone;

  console.log("signup");
  console.log(req.body.Password);

  const hashedPassword = md5(Password);

  //checks if the email is already in use
  await new Promise((resolve, reject) => {
    connection.query(
      "SELECT Email FROM credentials WHERE Email=? ",
      [email],
      (error, result) => {
        if (error) {
          return reject(error);
        } else {
          if (result.length > 0)
            return res.status(400).send("Email already in use");
          else resolve(result);
        }
      }
    );
  });

  //inserts a new user into the mySQL database
  await new Promise((resolve, reject) => {
    connection.query(
      "INSERT INTO credentials (name,surname,Email,Gender,address,phone,pass) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [firstname, lastname, email, Gender, address, phone, hashedPassword],
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
  });

  return res.status(201).send("Signed up");
});

app.post("/signout", requireLogin, async (req, res) => {
  req.session.destroy();

  return res.redirect("/");
});


const port = 5500;
app.listen(port, () => {
  console.log(`Server running on Port: ${port}`);
});
