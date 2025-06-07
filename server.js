require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const twilio = require('twilio');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const sgMail = require('@sendgrid/mail');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const { Client } = require('pg');

const app = express();
const PORT = 3000;

// Initialize PostgreSQL client
const client = new Client({
  host: process.env.DB_HOST,
  port: 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,  // This allows connection without verifying SSL cert
  },
});

client.connect()
  .then(() => console.log("Connected to PostgreSQL!"))
  .catch(err => console.error("Connection error", err.stack));

// Twilio and SendGrid setup (replace with your own credentials in .env)
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes

app.post('/submit-profile', async (req, res) => {
  try {
    const { name, birthdate, email, phone } = req.body;
    const sql = 'INSERT INTO profile (name, birthdate, email, phone) VALUES ($1, $2, $3, $4)';
    await client.query(sql, [name, birthdate, email, phone]);
    res.send('Profile made successfully!');
  } catch (err) {
    console.error('Error inserting profile data:', err);
    res.status(500).send('Error inserting profile data: ' + err.message);
  }
});

app.post('/submit-contact', async (req, res) => {
  try {
    const { contactName, eventType, date, email } = req.body;
    const sql = 'INSERT INTO birthdays (contactName, eventType, date, email) VALUES ($1, $2, $3, $4)';
    await client.query(sql, [contactName, eventType, date, email]);
    res.send('Event added successfully!');
  } catch (err) {
    console.error('Error inserting event data:', err);
    res.status(500).send('Error inserting event data: ' + err.message);
  }
});

app.post('/submit-message', async (req, res) => {
  try {
    const { contactName, fullMessage } = req.body;
    const sql = 'SELECT * FROM birthdays WHERE contactName = $1';
    const { rows } = await client.query(sql, [contactName]);
    if (rows.length > 0) {
      await sendEmailMessage(rows[0], fullMessage);
      console.log('Message sent to', rows[0].contactName);
      res.send('Message sent successfully!');
    } else {
      res.status(404).send('Contact not found');
    }
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).send('Error sending message: ' + err.message);
  }
});

app.post('/submit-edit-profile', async (req, res) => {
  try {
    const { name, birthdate, email, phone } = req.body;
    const sql = 'UPDATE profile SET name = $1, birthdate = $2, email = $3, phone = $4 WHERE id = 1';
    await client.query(sql, [name, birthdate, email, phone]);
    res.send('Profile edited successfully!');
  } catch (err) {
    console.error('Error editing profile data:', err);
    res.status(500).send('Error editing profile data: ' + err.message);
  }
});

app.post('/delete-profile', async (req, res) => {
  try {
    await client.query('TRUNCATE TABLE profile CASCADE');
    await client.query('TRUNCATE TABLE birthdays CASCADE');
    res.sendStatus(200);
  } catch (err) {
    console.error('Error deleting profile and birthdays:', err);
    res.status(500).send('Error deleting profile and birthdays: ' + err.message);
  }
});

app.post('/delete-event', async (req, res) => {
  try {
    const { contactName } = req.body;
    const sql = 'DELETE FROM birthdays WHERE contactName = $1';
    await client.query(sql, [contactName]);
    res.sendStatus(200);
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).send('Error deleting event: ' + err.message);
  }
});

app.get('/', async (req, res) => {
  try {
    const sqlEvents = `
      SELECT * FROM birthdays 
      ORDER BY 
        CASE 
          WHEN EXTRACT(MONTH FROM date) > EXTRACT(MONTH FROM CURRENT_DATE)
            OR (EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(DAY FROM date) >= EXTRACT(DAY FROM CURRENT_DATE))
          THEN TO_CHAR(date, 'MM-DD')
          ELSE TO_CHAR(date + INTERVAL '1 year', 'MM-DD')
        END;
    `;
    const sqlProfile = 'SELECT * FROM profile';

    const eventsResult = (await client.query(sqlEvents)).rows;
    const profileData = (await client.query(sqlProfile)).rows;

    res.render('index', { eventsResult, profileData });
  } catch (err) {
    console.error('Error loading homepage:', err);
    res.status(500).send('Error loading homepage: ' + err.message);
  }
});

// Email and SMS helper functions

async function sendEmailMessage(user, message) {
  try {
    const resProfile = await client.query('SELECT email FROM profile');
    if (resProfile.rows.length === 0) {
      console.error('No profile email found');
      return;
    }
    const toEmail = user.email;
    const fromEmail = resProfile.rows[0].email;

    const msg = {
      to: toEmail,
      from: fromEmail,
      subject: 'A Message For You',
      text: message,
    };
    await sgMail.send(msg);
    console.log('Email notification sent');
  } catch (err) {
    console.error('Error sending email message:', err);
  }
}

async function sendSMS(phone, messageBody) {
  try {
    const phoneNumber = parsePhoneNumberFromString(phone, 'IN');
    if (!phoneNumber) {
      console.error('Invalid phone number format');
      return;
    }
    const formattedPhoneNumber = phoneNumber.format('E.164');
    const message = await twilioClient.messages.create({
      body: messageBody,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhoneNumber,
    });
    console.log('SMS reminder sent:', message.sid);
  } catch (err) {
    console.error('Error sending SMS:', err);
  }
}

async function sendEmail(toEmail, subject, text) {
  try {
    const resProfile = await client.query('SELECT email FROM profile');
    if (resProfile.rows.length === 0) {
      console.error('No profile email found');
      return;
    }
    const fromEmail = resProfile.rows[0].email;
    const msg = { to: toEmail, from: fromEmail, subject, text };
    await sgMail.send(msg);
    console.log('Email notification sent');
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

async function sendSMSForTomorrow(user) {
  await sendSMS(
    (await client.query('SELECT phone FROM profile')).rows[0].phone,
    `${user.contactName}'s ${user.eventType} is coming up on ${user.date}! Don't forget to celebrate!`
  );
}

async function sendEmailForTomorrow(user) {
  const email = (await client.query('SELECT email FROM profile')).rows[0].email;
  await sendEmail(
    email,
    'Upcoming Event Reminder',
    `${user.contactName}'s ${user.eventType} is coming up on ${user.date}! Don't forget to celebrate!`
  );
}

async function sendSMSForToday(user) {
  await sendSMS(
    (await client.query('SELECT phone FROM profile')).rows[0].phone,
    `It's ${user.contactName}'s ${user.eventType} today! Did you wish them yet?`
  );
}

async function sendEmailForToday(user) {
  const email = (await client.query('SELECT email FROM profile')).rows[0].email;
  await sendEmail(
    email,
    'Event Reminder',
    `It's ${user.contactName}'s ${user.eventType} today! Did you wish them yet?`
  );
}

async function sendHappyBirthdaySMS(user) {
  await sendSMS(
    (await client.query('SELECT phone FROM profile')).rows[0].phone,
    `Happy Birthday ${user.name}! Hope you have a wonderful day!`
  );
}

async function sendHappyBirthdayEmail(user) {
  const email = (await client.query('SELECT email FROM profile')).rows[0].email;
  await sendEmail(
    email,
    "It's your day today!",
    `Happy Birthday ${user.name}! Hope you have a wonderful day!`
  );
}

// Cron job running every day at 9:00 AM server time
cron.schedule('0 9 * * *', async () => {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch birthdays for tomorrow
    const sqlEventsTomorrow = `
      SELECT * FROM birthdays 
      WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(DAY FROM date) = $2
    `;
    const usersTomorrow = (await client.query(sqlEventsTomorrow, [tomorrow.getMonth() + 1, tomorrow.getDate()])).rows;
    for (const user of usersTomorrow) {
      await sendSMSForTomorrow(user);
      await sendEmailForTomorrow(user);
    }

    // Fetch birthdays for today
    const usersToday = (await client.query(sqlEventsTomorrow, [today.getMonth() + 1, today.getDate()])).rows;
    for (const user of usersToday) {
      await sendSMSForToday(user);
      await sendEmailForToday(user);
    }

    // Fetch profile birthday for today (assuming id=1 for profile)
    const sqlProfileBirthday = `
      SELECT * FROM profile 
      WHERE EXTRACT(MONTH FROM birthdate) = $1 AND EXTRACT(DAY FROM birthdate) = $2 AND id = 1
    `;
    const profileUsers = (await client.query(sqlProfileBirthday, [today.getMonth() + 1, today.getDate()])).rows;
    for (const user of profileUsers) {
      await sendHappyBirthdaySMS(user);
      await sendHappyBirthdayEmail(user);
    }
  } catch (err) {
    console.error('Error in cron job:', err);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
