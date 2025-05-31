const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Initialize DOMPurify
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Content categories for filtering
const CONTENT_CATEGORIES = {
    HARMFUL: 'harmful',
    SPAM: 'spam',
    INAPPROPRIATE: 'inappropriate',
    HATE_SPEECH: 'hate_speech'
};

// Blocked words and patterns by category
const BLOCKED_CONTENT = {
    [CONTENT_CATEGORIES.HARMFUL]: [
        'suicide', 'kill', 'die', 'death', 'harm', 'hurt',
        'abuse', 'abusive', 'abusing', 'abused'
    ],
    [CONTENT_CATEGORIES.SPAM]: [
        'buy now', 'click here', 'limited time', 'act now',
        'make money', 'earn money', 'work from home',
        'discount', 'offer', 'promotion', 'sale'
    ],
    [CONTENT_CATEGORIES.INAPPROPRIATE]: [
        'porn', 'sex', 'nude', 'naked', 'explicit',
        'adult content', 'xxx'
    ],
    [CONTENT_CATEGORIES.HATE_SPEECH]: [
        'hate', 'racist', 'racism', 'sexist', 'sexism',
        'homophobic', 'transphobic', 'bigot'
    ]
};

// Regular expressions for pattern matching
const PATTERNS = {
    URL: /https?:\/\/[^\s]+/g,
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    PHONE: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g
};

class ContentModerator {
    constructor(db) {
        this.db = db;
    }

    // Sanitize and filter content
    async moderateContent(content, type = 'post') {
        // Sanitize HTML
        const sanitizedContent = DOMPurify.sanitize(content);
        
        // Check for blocked content
        const issues = this.checkContent(sanitizedContent);
        
        if (issues.length > 0) {
            return {
                allowed: false,
                issues,
                sanitizedContent
            };
        }

        // Check for spam patterns
        const spamScore = this.calculateSpamScore(sanitizedContent);
        if (spamScore > 0.7) {
            return {
                allowed: false,
                issues: [{ category: CONTENT_CATEGORIES.SPAM, reason: 'High spam score' }],
                sanitizedContent
            };
        }

        return {
            allowed: true,
            issues: [],
            sanitizedContent
        };
    }

    // Check content against blocked words and patterns
    checkContent(content) {
        const issues = [];
        const lowerContent = content.toLowerCase();

        // Check each category
        for (const [category, words] of Object.entries(BLOCKED_CONTENT)) {
            for (const word of words) {
                if (lowerContent.includes(word)) {
                    issues.push({
                        category,
                        reason: `Contains blocked word: ${word}`
                    });
                }
            }
        }

        // Check for patterns
        if (PATTERNS.URL.test(content)) {
            issues.push({
                category: CONTENT_CATEGORIES.SPAM,
                reason: 'Contains URL'
            });
        }

        if (PATTERNS.EMAIL.test(content)) {
            issues.push({
                category: CONTENT_CATEGORIES.SPAM,
                reason: 'Contains email address'
            });
        }

        if (PATTERNS.PHONE.test(content)) {
            issues.push({
                category: CONTENT_CATEGORIES.SPAM,
                reason: 'Contains phone number'
            });
        }

        return issues;
    }

    // Calculate spam score based on various factors
    calculateSpamScore(content) {
        let score = 0;
        const lowerContent = content.toLowerCase();

        // Check for excessive capitalization
        const capsCount = (content.match(/[A-Z]/g) || []).length;
        if (capsCount > content.length * 0.7) {
            score += 0.3;
        }

        // Check for repetitive characters
        if (/(.)\1{4,}/.test(content)) {
            score += 0.2;
        }

        // Check for common spam words
        const spamWords = BLOCKED_CONTENT[CONTENT_CATEGORIES.SPAM];
        const spamWordCount = spamWords.filter(word => lowerContent.includes(word)).length;
        score += (spamWordCount * 0.1);

        // Check for URL density
        const urlCount = (content.match(PATTERNS.URL) || []).length;
        if (urlCount > 0) {
            score += Math.min(urlCount * 0.2, 0.4);
        }

        return Math.min(score, 1);
    }

    // Report content
    async reportContent(contentId, reporterAlias, reason, category) {
        try {
            const report = {
                contentId,
                reporterAlias,
                reason,
                category,
                createdAt: new Date(),
                status: 'pending'
            };

            await this.db.collection('reports').insertOne(report);

            // If multiple reports exist, consider auto-moderation
            const reportCount = await this.db.collection('reports')
                .countDocuments({ contentId, status: 'pending' });

            if (reportCount >= 3) {
                await this.autoModerateContent(contentId);
            }

            return report;
        } catch (err) {
            console.error('Failed to create report:', err);
            throw err;
        }
    }

    // Auto-moderate content based on report count
    async autoModerateContent(contentId) {
        try {
            const content = await this.db.collection('posts')
                .findOne({ _id: contentId });

            if (!content) {
                throw new Error('Content not found');
            }

            // Update content status
            await this.db.collection('posts').updateOne(
                { _id: contentId },
                { $set: { status: 'hidden', moderatedAt: new Date() } }
            );

            // Update all pending reports
            await this.db.collection('reports').updateMany(
                { contentId, status: 'pending' },
                { $set: { status: 'resolved', resolvedAt: new Date() } }
            );
        } catch (err) {
            console.error('Failed to auto-moderate content:', err);
            throw err;
        }
    }

    // Get reports for moderation
    async getReports(status = 'pending', page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;

            const reports = await this.db.collection('reports')
                .find({ status })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray();

            const total = await this.db.collection('reports')
                .countDocuments({ status });

            return {
                reports,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (err) {
            console.error('Failed to fetch reports:', err);
            throw err;
        }
    }
}

module.exports = {
    ContentModerator,
    CONTENT_CATEGORIES
}; 