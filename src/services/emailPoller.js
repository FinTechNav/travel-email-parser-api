// src/services/emailPoller.js - Complete implementation
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class EmailPoller {
  constructor(emailProcessor) {
    this.emailProcessor = emailProcessor;
    this.prisma = new PrismaClient();
    this.isPolling = false;
    this.pollingInterval = null;

    // IMAP configuration for Zoho
    this.imapConfig = {
      user: process.env.PARSE_EMAIL_ADDRESS,
      password: process.env.PARSE_EMAIL_PASSWORD,
      host: process.env.PARSE_EMAIL_HOST || 'imap.zoho.com',
      port: parseInt(process.env.PARSE_EMAIL_PORT) || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 60000,
      authTimeout: 30000,
    };
  }

  async startPolling(intervalMinutes = 2) {
    if (this.isPolling) {
      logger.info('📧 Email polling already running');
      return;
    }

    if (!this.imapConfig.user || !this.imapConfig.password) {
      logger.warn(
        '⚠️  Email polling disabled: Missing PARSE_EMAIL_ADDRESS or PARSE_EMAIL_PASSWORD'
      );
      logger.info('💡 Add email credentials to .env to enable automatic email parsing');
      return;
    }

    this.isPolling = true;
    logger.info(`📧 Starting email polling every ${intervalMinutes} minutes`);
    logger.info(`📬 Monitoring: ${this.imapConfig.user}`);

    // Poll immediately, then set interval
    await this.pollForEmails();

    this.pollingInterval = setInterval(
      async () => {
        await this.pollForEmails();
      },
      intervalMinutes * 60 * 1000
    );
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    logger.info('📧 Email polling stopped');
  }

  async pollForEmails() {
    let imap = null;

    try {
      imap = new Imap(this.imapConfig);

      await new Promise((resolve, reject) => {
        let resolved = false;

        imap.once('ready', async () => {
          if (resolved) return;
          resolved = true;

          try {
            await this.processInbox(imap);
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        imap.once('error', (err) => {
          if (resolved) return;
          resolved = true;

          if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
            logger.debug('📧 IMAP connection timeout (normal)');
          } else {
            logger.error('❌ IMAP connection error:', err.message);
          }
          reject(err);
        });

        imap.once('end', () => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        });

        imap.connect();
      });
    } catch (error) {
      // Only log non-timeout errors
      if (error.code !== 'ECONNRESET' && error.code !== 'ETIMEDOUT') {
        logger.error('❌ Email polling error:', error.message);
      }
    } finally {
      if (imap && imap.state !== 'disconnected') {
        try {
          imap.end();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }

  async processInbox(imap) {
    return new Promise((resolve, reject) => {
      imap.openBox('INBOX', false, async (err, box) => {
        if (err) {
          return reject(err);
        }

        // Search for unread emails
        imap.search(['UNSEEN'], async (err, results) => {
          if (err) {
            return reject(err);
          }

          if (results.length === 0) {
            logger.debug('📭 No new emails found');
            imap.end();
            return resolve();
          }

          logger.info(`📬 Found ${results.length} new email(s) to process`);

          try {
            await this.processEmails(imap, results);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  }

  async processEmails(imap, messageIds) {
    return new Promise((resolve, reject) => {
      const fetch = imap.fetch(messageIds, {
        bodies: '',
        markSeen: false, // Don't mark as read until processed
      });

      const processedEmails = [];

      fetch.on('message', (msg, seqno) => {
        msg.on('body', async (stream, info) => {
          try {
            const parsed = await simpleParser(stream);
            const result = await this.processEmail(parsed, seqno);
            processedEmails.push({ seqno, success: !!result });
          } catch (error) {
            logger.error(`❌ Error processing email ${seqno}:`, error.message);
            processedEmails.push({ seqno, success: false, error: error.message });
          }
        });
      });

      fetch.once('error', (err) => {
        logger.error('❌ Fetch error:', err);
        reject(err);
      });

      fetch.once('end', () => {
        // Mark successfully processed emails as read
        const successfulEmails = processedEmails.filter((e) => e.success).map((e) => e.seqno);

        if (successfulEmails.length > 0) {
          imap.addFlags(successfulEmails, '\\Seen', (err) => {
            if (err) {
              logger.error('❌ Error marking emails as read:', err);
            } else {
              logger.info(`✅ Marked ${successfulEmails.length} email(s) as processed`);
            }
            imap.end();
            resolve(processedEmails);
          });
        } else {
          imap.end();
          resolve(processedEmails);
        }
      });
    });
  }

  async processEmail(parsed, seqno) {
    try {
      const from = parsed.from?.value?.[0]?.address || parsed.from?.text;
      const subject = parsed.subject || 'No Subject';
      const text = parsed.text;
      const html = parsed.html;

      if (!from) {
        logger.warn(`⚠️  Skipping email ${seqno}: missing sender address`);
        return null;
      }

      logger.info(`📧 Processing email from ${from}: "${subject}"`);

      // Use HTML content if available, otherwise plain text
      const emailContent = html || text;

      if (!emailContent || emailContent.trim().length < 50) {
        logger.warn(`⚠️  Skipping email ${seqno}: content too short or empty`);
        return null;
      }

      // Auto-create or find user based on sender email
      let user = await this.prisma.user.findUnique({ where: { email: from } });

      if (!user) {
        user = await this.createAutoUser(from);
        logger.info(`👤 Auto-created user for: ${from}`);
      }

      // Process the email with your travel parser
      const result = await this.emailProcessor.processEmail({
        content: emailContent,
        userEmail: from,
        userId: user.id,
        metadata: {
          source: 'email_polling',
          subject,
          receivedAt: new Date().toISOString(),
          messageId: parsed.messageId,
          to: 'trips@fintechnav.com',
        },
      });

      logger.info(
        `✅ Successfully parsed email from ${from}: ${result.type} detected (${result.confidence * 100}% confidence)`
      );

      return result;
    } catch (error) {
      logger.error(`❌ Error processing email ${seqno}:`, error.message);
      throw error;
    }
  }

  async createAutoUser(email) {
    try {
      return await this.prisma.user.create({
        data: {
          email,
          name: email.split('@')[0], // Use email prefix as name
          password: await bcrypt.hash(uuidv4(), 12), // Random password
          apiKey: uuidv4().replace(/-/g, ''),
        },
      });
    } catch (error) {
      logger.error(`❌ Failed to create user for ${email}:`, error.message);
      throw error;
    }
  }

  // Health check method
  async testConnection() {
    try {
      const imap = new Imap(this.imapConfig);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        imap.once('ready', () => {
          clearTimeout(timeout);
          imap.end();
          resolve(true);
        });

        imap.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });

        imap.connect();
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = EmailPoller;
