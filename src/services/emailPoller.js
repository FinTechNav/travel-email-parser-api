// src/services/emailPoller.js - Enhanced with duplicate prevention
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const logger = require('../utils/logger');

class EmailPoller {
  constructor(emailProcessor) {
    this.emailProcessor = emailProcessor;
    this.prisma = new PrismaClient();
    this.isPolling = false;
    this.pollingInterval = null;
    this.keyboardListenerActive = false;

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

  /**
   * Generate a unique hash for email content to prevent duplicates
   */
  generateEmailHash(messageId, subject, from, content) {
    // Create a hash based on multiple email attributes
    const hashInput = `${messageId || ''}|${subject || ''}|${from || ''}|${content.substring(0, 500)}`;
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Check if email has already been processed
   */
  async isEmailProcessed(emailHash, messageId) {
    try {
      // Check both by hash and messageId for redundancy
      const existing = await this.prisma.processedEmail.findFirst({
        where: {
          OR: [{ emailHash }, { messageId: messageId || null }],
        },
      });

      return !!existing;
    } catch (error) {
      logger.error('❌ Error checking processed emails:', error);
      return false; // If we can't check, allow processing (better than blocking)
    }
  }

  /**
   * Mark email as processed in database
   */
  async markEmailProcessed(emailHash, messageId, subject, from, userId, success = true) {
    try {
      await this.prisma.processedEmail.create({
        data: {
          emailHash,
          messageId,
          subject: subject?.substring(0, 255) || 'No Subject',
          fromAddress: from?.substring(0, 255),
          userId,
          processedAt: new Date(),
          success,
          source: 'email_polling',
        },
      });

      logger.debug(`✅ Marked email as processed: ${emailHash.substring(0, 8)}...`);
    } catch (error) {
      // If it's a unique constraint error, that's fine - email was already marked
      if (error.code !== 'P2002') {
        logger.error('❌ Error marking email as processed:', error);
      }
    }
  }

  /**
   * Setup keyboard listener for manual polling
   */

  // Replace the setupKeyboardListener method in your emailPoller.js with this debug version:

  setupKeyboardListener() {
    try {
      logger.info('🔍 Debug: Checking if keyboard listener is already active...');
      if (this.keyboardListenerActive) {
        logger.info('🔍 Debug: Keyboard listener already active, returning');
        return;
      }

      logger.info('🔍 Debug: Checking TTY availability...');
      logger.info(`🔍 Debug: process.stdin.isTTY = ${process.stdin.isTTY}`);

      // Enable raw mode to capture single key presses
      if (process.stdin.isTTY) {
        logger.info('🔍 Debug: Setting raw mode...');
        process.stdin.setRawMode(true);

        logger.info('🔍 Debug: Resuming stdin...');
        process.stdin.resume();

        logger.info('🔍 Debug: Setting encoding...');
        process.stdin.setEncoding('utf8');

        logger.info('🔍 Debug: Adding data listener...');
        process.stdin.on('data', (key) => {
          try {
            // Handle different key presses
            switch (key) {
              case 'p':
              case 'P':
                logger.info('⌨️  Manual poll triggered by keypress');
                this.pollForEmails().catch((error) => {
                  logger.error('❌ Manual poll failed:', error.message);
                });
                break;

              case 's':
              case 'S':
                this.showStatus();
                break;

              case 'c':
              case 'C':
                this.cleanupOldRecords()
                  .then(() => {
                    logger.info('🧹 Manual cleanup completed');
                  })
                  .catch((error) => {
                    logger.error('❌ Manual cleanup failed:', error.message);
                  });
                break;

              case 'h':
              case 'H':
              case '?':
                this.showHelp();
                break;

              case '\u0003': // Ctrl+C
                logger.info('👋 Shutting down email poller...');
                this.stopPolling();
                process.exit(0);
                break;

              case 'q':
              case 'Q':
                logger.info('👋 Shutting down email poller...');
                this.stopPolling();
                process.exit(0);
                break;
            }
          } catch (error) {
            logger.error('❌ Error in keyboard handler:', error);
          }
        });

        this.keyboardListenerActive = true;
        logger.info('🔍 Debug: About to show help...');
        this.showHelp();
        logger.info('🔍 Debug: Keyboard listener setup completed successfully');
      } else {
        logger.warn('⚠️  TTY not available - keyboard controls disabled');
      }
    } catch (error) {
      logger.error('❌ Error in setupKeyboardListener:', error);
      logger.error('Stack trace:', error.stack);
      throw error; // Re-throw the error so we can see it in the startup logs
    }
  }
  /**
   * Show current poller status
   */
  async showStatus() {
    try {
      const totalProcessed = await this.prisma.processedEmail.count();
      const successfulToday = await this.prisma.processedEmail.count({
        where: {
          success: true,
          processedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });

      logger.info(`📊 Email Poller Status:`);
      logger.info(`   • Status: ${this.isPolling ? '🟢 Running' : '🔴 Stopped'}`);
      logger.info(`   • Total emails processed: ${totalProcessed}`);
      logger.info(`   • Successful today: ${successfulToday}`);
      logger.info(`   • Monitoring: ${this.imapConfig.user || 'Not configured'}`);
      logger.info(`   • Next poll: ${this.isPolling ? 'Every 2 minutes' : 'Manual only'}`);
    } catch (error) {
      logger.error('❌ Failed to get status:', error.message);
    }
  }

  /**
   * Clean up old processed email records (older than 30 days)
   */
  async cleanupOldRecords() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deleted = await this.prisma.processedEmail.deleteMany({
        where: {
          processedAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      if (deleted.count > 0) {
        logger.info(`🧹 Cleaned up ${deleted.count} old processed email records`);
      }
    } catch (error) {
      logger.error('❌ Error cleaning up old records:', error);
    }
  }

  // In src/services/emailPoller.js, find the startPolling method and replace it with this:

  async startPolling(intervalMinutes = 2) {
    try {
      logger.info('🔍 Debug: Starting EmailPoller initialization...');

      if (this.isPolling) {
        logger.info('📧 Email polling already running');
        return;
      }

      if (!this.imapConfig.user || !this.imapConfig.password) {
        logger.warn(
          '⚠️  Email polling disabled: Missing PARSE_EMAIL_ADDRESS or PARSE_EMAIL_PASSWORD'
        );
        logger.info('💡 Add email credentials to .env to enable automatic email parsing');
        logger.info('⌨️  You can still use manual controls - press H for help');
        this.setupKeyboardListener();
        return;
      }

      this.isPolling = true;
      logger.info(`📧 Starting email polling every ${intervalMinutes} minutes`);
      logger.info(`📬 Monitoring: ${this.imapConfig.user}`);

      // Setup keyboard controls
      logger.info('🔍 Debug: Setting up keyboard controls...');
      this.setupKeyboardListener();

      // Clean up old records on startup
      logger.info('🔍 Debug: Cleaning up old records...');
      await this.cleanupOldRecords();

      // Poll immediately, then set interval
      logger.info('🔍 Debug: Starting initial poll...');
      await this.pollForEmails();

      logger.info('🔍 Debug: Setting up polling interval...');
      this.pollingInterval = setInterval(
        async () => {
          try {
            await this.pollForEmails();
          } catch (error) {
            logger.error('❌ Error in polling interval:', error);
          }
        },
        intervalMinutes * 60 * 1000
      );

      // Clean up old records daily
      setInterval(
        async () => {
          try {
            await this.cleanupOldRecords();
          } catch (error) {
            logger.error('❌ Error in cleanup interval:', error);
          }
        },
        24 * 60 * 60 * 1000 // 24 hours
      );

      logger.info('✅ EmailPoller startup completed successfully');
    } catch (error) {
      logger.error('❌ Fatal error in EmailPoller startup:', error);
      this.stopPolling();
      throw error; // Re-throw to let the caller handle it
    }
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;

    // Cleanup keyboard listener
    if (this.keyboardListenerActive && process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      this.keyboardListenerActive = false;
    }

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
        markSeen: false, // Don't mark as read until we verify processing
      });

      const processedEmails = [];

      fetch.on('message', (msg, seqno) => {
        msg.on('body', async (stream, info) => {
          try {
            const parsed = await simpleParser(stream);
            const result = await this.processEmail(parsed, seqno);
            processedEmails.push({
              seqno,
              success: !!result,
              messageId: parsed.messageId,
            });
          } catch (error) {
            logger.error(`❌ Error processing email ${seqno}:`, error.message);
            processedEmails.push({
              seqno,
              success: false,
              error: error.message,
              messageId: null,
            });
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
          // Even if no emails were successfully processed, mark them as seen
          // to prevent infinite retry loops for permanently broken emails
          const allEmails = processedEmails.map((e) => e.seqno);
          if (allEmails.length > 0) {
            imap.addFlags(allEmails, '\\Seen', (err) => {
              if (err) {
                logger.error('❌ Error marking failed emails as read:', err);
              }
              imap.end();
              resolve(processedEmails);
            });
          } else {
            imap.end();
            resolve(processedEmails);
          }
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
      const messageId = parsed.messageId;

      if (!from) {
        logger.warn(`⚠️  Skipping email ${seqno}: missing sender address`);
        return null;
      }

      // Use HTML content if available, otherwise plain text
      const emailContent = html || text;

      if (!emailContent || emailContent.trim().length < 50) {
        logger.warn(`⚠️  Skipping email ${seqno}: content too short or empty`);
        return null;
      }

      // Generate unique hash for this email
      const emailHash = this.generateEmailHash(messageId, subject, from, emailContent);

      // Check if this email has already been processed
      const alreadyProcessed = await this.isEmailProcessed(emailHash, messageId);

      if (alreadyProcessed) {
        logger.info(`🔄 Skipping already processed email from ${from}: "${subject}"`);
        return { status: 'skipped', reason: 'already_processed' };
      }

      logger.info(`📧 Processing email from ${from}: "${subject}"`);

      // Auto-create or find user based on sender email
      let user = await this.prisma.user.findUnique({ where: { email: from } });

      if (!user) {
        user = await this.createAutoUser(from);
        logger.info(`👤 Auto-created user for: ${from}`);
      }

      // Mark as processing (before actual processing to prevent race conditions)
      await this.markEmailProcessed(emailHash, messageId, subject, from, user.id, false);

      let processingSuccess = false;
      let result = null;

      try {
        // Process the email with your travel parser
        result = await this.emailProcessor.processEmail({
          content: emailContent,
          userEmail: from,
          userId: user.id,
          metadata: {
            source: 'email_polling',
            subject,
            receivedAt: new Date().toISOString(),
            messageId,
            to: 'trips@fintechnav.com',
            emailHash, // Include hash for additional tracking
          },
        });

        processingSuccess = true;

        logger.info(
          `✅ Successfully parsed email from ${from}: ${result.type} detected (${(result.confidence * 100).toFixed(1)}% confidence)`
        );

        // Update the processed record to mark as successful
        await this.prisma.processedEmail.update({
          where: { emailHash },
          data: {
            success: true,
            updatedAt: new Date(),
          },
        });
      } catch (processingError) {
        logger.error(`❌ Error processing email content for ${from}:`, processingError.message);

        // Keep the record marked as unsuccessful (success: false)
        // This prevents reprocessing but allows manual review

        return null;
      }

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

  // Manual method to reprocess failed emails (for debugging)
  async reprocessFailedEmails(limit = 10) {
    try {
      const failedEmails = await this.prisma.processedEmail.findMany({
        where: { success: false },
        orderBy: { processedAt: 'desc' },
        take: limit,
      });

      logger.info(`🔄 Found ${failedEmails.length} failed emails to potentially reprocess`);

      for (const failedEmail of failedEmails) {
        logger.info(
          `🔄 Consider manual review for: ${failedEmail.subject} from ${failedEmail.fromAddress}`
        );
      }

      return failedEmails;
    } catch (error) {
      logger.error('❌ Error fetching failed emails:', error);
      return [];
    }
  }
}

module.exports = EmailPoller;
