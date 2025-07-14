// autoPublishNews.js
// Cron job to auto-publish scheduled news articles

const cron = require('node-cron');
const db = require('./models/db');

// Run every minute
cron.schedule('* * * * *', async () => {
  try {
    // Find articles ready to publish
    const [rows] = await db.query(`
      SELECT news_id, title FROM news
      WHERE status = 'draft'
        AND published_at IS NOT NULL
        AND published_at <= CURRENT_TIMESTAMP
    `);
    if (rows.length > 0) {
      // Update status to published
      await db.query(`
        UPDATE news
        SET status = 'published', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'draft'
          AND published_at IS NOT NULL
          AND published_at <= CURRENT_TIMESTAMP
      `);
      console.log(`[AutoPublish] Published ${rows.length} articles:`, rows.map(r => r.title).join(', '));
    }
  } catch (err) {
    console.error('[AutoPublish] Error:', err);
  }
});

console.log('Auto-publish news cron job started.'); 