var User = require('../models/User');
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
  service: 'Mailgun',
  auth: {
    user: process.env.MAILGUN_USER,
    pass: process.env.MAILGUN_PASSWORD,
  }
});

/**
 * GET /admin/sendEmail
 * Send email to users.
 */
exports.getSendEmail = function(req, res) {
    res.render('admin/email', {
        title: 'Send Email'
    });
};


/**
 * POST /admin/sendEmail
 * Send email to users.
 */
exports.postSendEmail = function(req, res) {
    req.assert('name', 'Name cannot be blank').notEmpty();
    req.assert('subject', 'Subject cannot be blank').notEmpty();
    req.assert('email_editor', 'Email body cannot be blank').notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/admin/sendEmail');
    }

    var name = req.body.name;
    var subject = req.body.subject;
    var html_body = req.body.email_editor;
    var text_body = req.body.text_body || '';
    var query = req.body.scope == 'all' ? {} : {isAdmin: true};
    User.find(query, {_id: 0, email: 1}, function (err, results) {
        emails = results.map(function (elem) {return elem.email});
        var mailOptions = {
            bcc: emails,
            from: name + ' <team@shareonbazaar.eu>',
            subject: subject,
            html: html_body,
            text: text_body,
        };
        transporter.sendMail(mailOptions, function(err) {
            if (err) {
                req.flash('errors', { msg: err.message });
                return res.redirect('/admin/sendEmail');
            }
            req.flash('success', { msg: 'Email has been sent successfully!' });
            res.redirect('/admin/sendEmail');
        });
    });
};
