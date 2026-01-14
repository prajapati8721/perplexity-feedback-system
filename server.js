
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

dotenv.config();

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST'],
  credentials: true
}));

// Configure Outlook SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.OUTLOOK_EMAIL,
    pass: process.env.OUTLOOK_APP_PASSWORD
  }
});

// Store feedback endpoint
app.post('/api/submit-feedback', async (req, res) => {
  console.log('Received feedback submission:', req.body);
  
  try {
    const {
      user_name,
      user_email,
      search_better,
      first_try,
      daily_workflow,
      verify_sources,
      followup_context,
      research_time_hours,
      research_time_minutes,
      generative_time_hours,
      generative_time_minutes
    } = req.body;

    // Validate required fields
    if (!user_name || !user_email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name or email'
      });
    }

    // Create email body for admin
    const adminEmailBody = `
NEW PERPLEXITY FEEDBACK SUBMISSION
===================================

Timestamp: ${new Date().toLocaleString()}

USER INFORMATION:
Name: ${user_name}
Email: ${user_email}

RESPONSES:
---------
Q1. Better than traditional search: ${search_better}
Q2. Answer on first try: ${first_try}
Q3. Fits daily workflow: ${daily_workflow}
Q4. Need to verify sources: ${verify_sources}
Q5. Follow-up context handling: ${followup_context}

TIME SAVED (per week):
---------
Research tasks: ${research_time_hours} hours ${research_time_minutes} minutes
Generative tasks: ${generative_time_hours} hours ${generative_time_minutes} minutes

===================================
    `;

    // Send email to admin
    await transporter.sendMail({
      from: process.env.OUTLOOK_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: `📊 New Perplexity Feedback from ${user_name}`,
      text: adminEmailBody,
      html: `<pre>${adminEmailBody}</pre>`
    });

    console.log('✓ Admin email sent to ' + process.env.ADMIN_EMAIL);

    // Send confirmation email to user
    const userEmailBody = `
Hello ${user_name},

Thank you for providing your feedback on Perplexity! 🎉

We truly value your input and use it to continuously improve our product.

Your feedback summary:
- Submitted: ${new Date().toLocaleString()}
- Email: ${user_email}

If you have any additional comments, please reply to this email.

Best regards,
Perplexity Feedback Team
    `;

    await transporter.sendMail({
      from: process.env.OUTLOOK_EMAIL,
      to: user_email,
      subject: '✓ Feedback Received - Thank You!',
      text: userEmailBody
    });

    console.log('✓ User confirmation email sent to ' + user_email);

    res.json({
      success: true,
      message: 'Feedback submitted successfully!',
      data: {
        name: user_name,
        email: user_email,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running ✓' });
});

// Optional root route (so / doesn't show error)
//app.get('/', (req, res) => {res.send('Perplexity feedback API is running.')});

//Serve the HTML Form at the root URL
const path = require('path');
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,'perplexity-feedback-form.html'));
});
// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Admin email: ${process.env.ADMIN_EMAIL}`);
  console.log(`✓ Press Ctrl+C to stop server`);
});