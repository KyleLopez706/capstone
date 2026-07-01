import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { OAuth2Client } from "google-auth-library";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// POST /api/auth/register — Create a new admin user
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required." });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ where: { username } });
    if (existingAdmin) {
      return res.status(409).json({ message: "Username already taken." });
    }

    // Hash the password and create the admin
    const hashedPassword = await bcrypt.hash(password, 10);
    await Admin.create({ username, password: hashedPassword });

    res.status(201).json({ message: "Admin registered successfully." });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
});

// POST /api/auth/login — Authenticate and return a JWT
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required." });
    }

    // Look up the admin
    const admin = await Admin.findOne({ where: { username } });
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Compare the bcrypt hashed password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Generate a JWT (expires in 24 hours)
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.status(200).json({ message: "Login successful.", token });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
});

// POST /api/auth/user-register — Create a new customer account
router.post("/user-register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    // Hash the password and create the user
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ email, password: hashedPassword });

    res.status(201).json({ message: "Account created successfully." });
  } catch (error) {
    console.error("User registration error:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
});

// POST /api/auth/user-login — Authenticate a customer and return a JWT
router.post("/user-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Compare bcrypt hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Generate JWT with id and role in payload (expires in 24 hours)
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.status(200).json({ message: "Login successful.", token });
  } catch (error) {
    console.error("User login error:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
});

// POST /api/auth/forgot-password — Generate a 6-digit PIN and email it
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    // Find user (don't reveal if email exists or not for security)
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(200).json({ message: "If this email is registered, a PIN has been sent." });
    }

    // Generate a secure 6-digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    // Save PIN and set expiry to 15 minutes from now
    await user.update({
      resetPasswordToken: pin,
      resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000),
    });

    // Send the elegantly styled HTML email
    await sendEmail({
      to: email,
      subject: "Six Sigmaphil — Your Password Reset PIN",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Password Reset</title>
        </head>
        <body style="margin:0;padding:0;background-color:#F9F9FB;font-family:'Segoe UI',Roboto,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background:#232B32;padding:32px 40px;text-align:center;">
                      <p style="margin:0;color:#C5A059;font-size:11px;letter-spacing:4px;text-transform:uppercase;">Six Sigmaphil</p>
                      <p style="margin:6px 0 0;color:#F9F9FB;font-size:20px;font-weight:300;letter-spacing:2px;">PASSWORD RESET</p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:40px;">
                      <p style="margin:0 0 20px;color:#232B32;font-size:15px;line-height:1.6;">Hello,</p>
                      <p style="margin:0 0 30px;color:#6B7280;font-size:14px;line-height:1.7;">
                        We received a request to reset your password. Use the PIN below to proceed.
                        This PIN is valid for <strong style="color:#232B32;">15 minutes</strong>.
                      </p>
                      <!-- PIN Box -->
                      <div style="background:#F9F9FB;border:1px solid #E2E8F0;border-radius:12px;padding:28px;text-align:center;margin-bottom:30px;">
                        <p style="margin:0 0 8px;color:#9CA3AF;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Your Reset PIN</p>
                        <p style="margin:0;color:#232B32;font-size:42px;font-weight:700;letter-spacing:10px;">${pin}</p>
                      </div>
                      <p style="margin:0 0 12px;color:#9CA3AF;font-size:13px;line-height:1.6;">
                        If you did not request this, you can safely ignore this email. Your account remains secure.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background:#F9F9FB;border-top:1px solid #E2E8F0;padding:20px 40px;text-align:center;">
                      <p style="margin:0;color:#9CA3AF;font-size:12px;">Six Sigmaphil Corp. &mdash; Premium Granite &amp; Stone</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    res.status(200).json({ message: "If this email is registered, a PIN has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
});

// POST /api/auth/reset-password — Verify PIN and set new password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, pin, newPassword } = req.body;

    if (!email || !pin || !newPassword) {
      return res.status(400).json({ message: "Email, PIN, and new password are required." });
    }

    // Find user where PIN matches and hasn't expired
    const user = await User.findOne({
      where: {
        email,
        resetPasswordToken: pin,
        resetPasswordExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired PIN. Please request a new one." });
    }

    // Hash the new password and clear the reset token fields
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    res.status(200).json({ message: "Password reset successfully. You can now sign in." });
  } catch (error) {
    console.error("Reset password error:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
});

// POST /api/auth/google-login — Verify Google ID token, find or create user, return JWT
router.post("/google-login", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Google credential is required." });
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, sub: googleId } = payload;

    if (!email) {
      return res.status(400).json({ message: "Could not retrieve email from Google account." });
    }

    // Find existing user by email or googleId
    let user = await User.findOne({
      where: {
        [Op.or]: [{ email }, { googleId }],
      },
    });

    if (!user) {
      // Auto-register: create new user with Google credentials (no password)
      user = await User.create({ email, googleId, password: null });
    } else if (!user.googleId) {
      // Link googleId to existing email-registered account
      await user.update({ googleId });
    }

    // Generate our backend JWT — same shape as normal login
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.status(200).json({ message: "Google login successful.", token, email });
  } catch (error) {
    console.error("Google login error:", error.message);
    res.status(401).json({ message: "Invalid Google token. Please try again." });
  }
});

export default router;

