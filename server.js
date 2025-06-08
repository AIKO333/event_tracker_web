const express = require('express');
const cron = require('node-cron');
const twilio = require('twilio')
const bodyParser = require('body-parser');
const mysql = require('mysql');
const cors = require('cors');
const app = express();
const path = require('path');
const sgMail = require('@sendgrid/mail');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const PORT = process.env.PORT || 3000;

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.PORT
});

connection.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname)));

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/submit-profile', (req, res) => {
    const { name, birthdate, email, phone } = req.body;

    const sql = 'INSERT INTO profile (name, birthdate, email, phone) VALUES (?, ?, ?, ?)';
    connection.query(sql, [name, birthdate, email, phone], (err, result) => {
        if (err) {
            console.error('Error inserting profile data into database:', err);
            res.status(500).send('Error inserting profile data into database: ' + err.message);
            return;
        }
        console.log('Profile data inserted into database:', result);
        res.send('Profile made successfully!');
    });
});

app.post('/submit-contact', (req, res) => {
    const { contactName, eventType, date, email } = req.body;

    const sql = 'INSERT INTO birthdays (contactName, eventType, date, email) VALUES (?, ?, ?, ?)';
    connection.query(sql, [contactName, eventType, date, email], (err, result) => {
        if (err) {
            console.error('Error inserting event data into database:', err);
            res.status(500).send('Error inserting event data into database: ' + err.message);
            return;
        }
        console.log('Event data inserted into database:', result);
        res.send('Event added successfully!');
    });
});

app.post('/submit-message', (req, res) => {
    const { contactName, fullMessage } = req.body;

    const sql = 'SELECT * from birthdays where contactName = ?';
    connection.query(sql, [contactName], (err, result) => {
        if (err) {
            console.error('Error inserting event data into database:', err);
            res.status(500).send('Error inserting event data into database: ' + err.message);
            return;
        }
        else
        {
            if(result.length > 0)
                {
                    sendEmailMessage(result[0], fullMessage);
                    console.log('Message sent to ', result[0].contactName);
                    res.send('Message sent successfully!');
                }
        }
    });
});

app.post('/submit-edit-profile', (req, res) => {
    const { name, birthdate, email, phone } = req.body;

    const sql = 'UPDATE profile SET name = ?, birthdate = ?, email = ?, phone = ? where id = 1';
    connection.query(sql, [name, birthdate, email, phone, name], (err, result) => {
        if (err) {
            console.error('Error editing profile data:', err);
            res.status(500).send('Error editing profile data ' + err.message);
            return;
        }
        console.log('Profile data editted:', result);
        res.send('Profile editted successfully!');
    });
});

app.post('/delete-profile', (req, res) => {
    const sql = 'TRUNCATE TABLE profile;';
    const sql2 = 'TRUNCATE TABLE birthdays;';
    connection.query(sql, (err, result) => {
        if (err) {
            console.error('Error deleting profile from database:', err);
            res.status(500).send('Error deleting profile from database: ' + err.message);
        }
        else {
            connection.query(sql2, (err, result2) => {
                if (err) {
                    console.error('Error deleting birthdays from database:', err);
                    res.status(500).send('Error deleting birthdays from database: ' + err.message);
                }
                else {
                    console.log('Profile deleted from database:', result2);
                    res.sendStatus(200);
                }
            });
        }
    });
});

app.post('/delete-event', (req, res) => {
    const { contactName } = req.body;

    const sql = 'delete from birthdays where contactName = ?';
    connection.query(sql, [contactName], (err, result) => {
        if (err) {
            console.error('Error deleting row from database:', err);
            res.status(500).send('Error deleting row from database: ' + err.message);
        }
        else {
            console.log('Row deleted from database:', result);
            res.sendStatus(200);
        }
    });
});

app.get('/', (req, res) => {
    const sql = "SELECT * FROM birthdays ORDER BY CASE WHEN MONTH(date) > MONTH(CURRENT_DATE()) OR (MONTH(date) = MONTH(CURRENT_DATE()) AND DAY(date) >= DAY(CURRENT_DATE())) THEN DATE_FORMAT(date, '%m-%d') ELSE DATE_FORMAT(DATE_ADD(date, INTERVAL 1 YEAR), '%m-%d') END;";
    
    const sql2 = "SELECT * FROM profile;";

    connection.query(sql, (err, data) => {
      if (err) {
        throw err;
      }

      connection.query(sql2, (err2, data2) => {
        if (err2) {
          throw err2;
        }
      res.render('index', { eventsResult: data, profileData: data2 });
    });
  });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const twilioClient = new twilio('ACa8b7f8803eb57f1b9918dc305fe1070f', 'c2fa5d451be4d354bc37f95b95b6e384');

sgMail.setApiKey('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');

function sendEmailMessage(user, message) {
    const sql = 'SELECT email FROM profile';
    connection.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching phone number from profile:', err);
            return;
        }
        if (result.length > 0) {
            const toEmail = user.email;
            const fromEmail = result[0].email;
            const msg = {
                to: toEmail,
                from: fromEmail,
                subject: 'A Message For You',
                text: message,
            };

            sgMail.send(msg)
            .then(() => console.log('Email notification sent'))
            .catch(error => console.error('Error sending email notification: ', error));
        }
        else {
            console.error('No profile found for user');
        }
    });
}

function sendSMSForTommorrow(user) {
    const sql = 'SELECT phone FROM profile';
    connection.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching phone number from profile:', err);
            return;
        }
        if (result.length > 0) {
            const phoneNumber = parsePhoneNumberFromString(result[0].phone, 'IN'); 
            const formattedPhoneNumber = phoneNumber.format('E.164');
            twilioClient.messages.create({
            body: `${user.contactName}'s ${user.eventType} is coming up on ${user.date}! Don't forget to celebrate!`,
            from: '+12098829488',
            to: formattedPhoneNumber
            })
            .then(message => console.log(`SMS reminder sent: ${message.sid}`))
            .catch(error => console.error('Error sending SMS reminder:', error));
        }
        else {
            console.error('No profile found for user');
        }
    });
}

function sendEmailForTommorrow(user) {
    const sql = 'SELECT email FROM profile';
    connection.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching phone number from profile:', err);
            return;
        }
        if (result.length > 0) {
            const toEmail = result[0].email;
            const msg = {
                to: toEmail,
                from: 'ayeshamahaboob8@gmail.com',
                subject: 'Upcoming Event Reminder',
                text: `${user.contactName}'s ${user.eventType} is coming up on ${user.date}! Don't forget to celebrate!`,
            };

            sgMail.send(msg)
            .then(() => console.log('Email notification sent'))
            .catch(error => console.error('Error sending email notification: ', error));
        }
        else {
            console.error('No profile found for user');
        }
    });
}

function sendSMSForToday(user) {
    const sql = 'SELECT phone FROM profile';
    connection.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching phone number from profile:', err);
            return;
        }
        if (result.length > 0) {
            const phoneNumber = parsePhoneNumberFromString(result[0].phone, 'IN');
            const formattedPhoneNumber = phoneNumber.format('E.164');
            twilioClient.messages.create({
            body: `Its ${user.contactName}'s ${user.eventType} today! Did you wish them yet?`,
            from: '+12098829488',
            to: formattedPhoneNumber
            })
            .then(message => console.log(`SMS reminder sent: ${message.sid}`))
            .catch(error => console.error('Error sending SMS reminder:', error));
        }
        else {
            console.error('No profile found for user');
        }
    });
}

function sendEmailForToday(user) {
    const sql = 'SELECT email FROM profile';
    connection.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching phone number from profile:', err);
            return;
        }
        if (result.length > 0) {
            const toEmail = result[0].email;
            const msg = {
                to: toEmail,
                from: 'ayeshamahaboob8@gmail.com',
                subject: 'Upcoming Event Reminder',
                text: `Its ${user.contactName}'s ${user.eventType} today! Did you wish them yet?`,
            };

            sgMail.send(msg)
            .then(() => console.log('Email notification sent'))
            .catch(error => console.error('Error sending email notification: ', error));
        }
        else {
            console.error('No profile found for user');
        }
    });
}

function sendHappyBirthdaySMS(user) {
    const sql = 'SELECT phone FROM profile';
    connection.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching phone number from profile:', err);
            return;
        }
        if (result.length > 0) {
            const phoneNumber = parsePhoneNumberFromString(result[0].phone, 'IN');
            const formattedPhoneNumber = phoneNumber.format('E.164');
            twilioClient.messages.create({
            body: `Happy Birthday ${user.name}! Hope you have a wonderful day!`,
            from: '+12098829488',
            to: formattedPhoneNumber
            })
            .then(message => console.log(`SMS reminder sent: ${message.sid}`))
            .catch(error => console.error('Error sending SMS reminder:', error));
        }
        else {
            console.error('No profile found for user');
        }
    });
}

function sendHappyBirthdayEmail(user) {
    const sql = 'SELECT email FROM profile';
    connection.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching phone number from profile:', err);
            return;
        }
        if (result.length > 0) {
            const toEmail = result[0].email;
            const msg = {
                to: toEmail,
                from: 'ayeshamahaboob8@gmail.com',
                subject: `It's your day today!`,
                text: `Happy Birthday ${user.name}! Hope you have a wonderful day!`,
            };

            sgMail.send(msg)
            .then(() => console.log('Email notification sent'))
            .catch(error => console.error('Error sending email notification: ', error));
        }
        else {
            console.error('No profile found for user');
        }
    });
}

  cron.schedule('0 9 * * *', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const queryEvents = 'SELECT * FROM birthdays WHERE MONTH(date) = ? AND DAY(date) = ?';
    connection.query(queryEvents, [tomorrow.getMonth() + 1, tomorrow.getDate()], (err, users) => {
      if (err) {
        console.error('Error fetching upcoming birthdays:', err);
        return;
      }

      users.forEach(user => {
        sendSMSForTommorrow(user);
        sendEmailForTommorrow(user);
      });
    });

    connection.query(queryEvents, [today.getMonth() + 1, today.getDate()], (err, users) => {
        if (err) {
          console.error('Error fetching upcoming birthdays:', err);
          return;
        }
        
        users.forEach(user => {
          sendSMSForToday(user);
          sendEmailForToday(user);
        });
      });

      const queryEvent = 'SELECT * FROM profile WHERE MONTH(birthdate) = ? AND DAY(birthdate) = ? AND id = 1';
      connection.query(queryEvent, [today.getMonth() + 1, today.getDate()], (err, users) => {
        if (err) {
          console.error('Error fetching upcoming birthdays:', err);
          return;
        }
        
        users.forEach(user => {
          sendHappyBirthdaySMS(user);
          sendHappyBirthdayEmail(user);
        });
      });
  });
