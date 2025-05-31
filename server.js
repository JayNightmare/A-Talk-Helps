const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const { ContentModerator, CONTENT_CATEGORIES } = require('./utils/contentModeration');

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

// Initialize DOMPurify
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Content filtering middleware
const filterContent = (req, res, next) => {
    if (req.body.content) {
        // Sanitize content
        req.body.content = DOMPurify.sanitize(req.body.content);
        
        // Basic content filtering
        const blockedWords = ['spam', 'advertisement', 'buy now']; // Add more as needed
        const content = req.body.content.toLowerCase();
        
        if (blockedWords.some(word => content.includes(word))) {
            return res.status(400).json({ message: 'Content contains blocked words' });
        }
    }
    next();
};

// Rate limiting middleware
const rateLimit = (req, res, next) => {
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 100; // per windowMs
    
    if (!req.session.requests) {
        req.session.requests = [];
    }
    
    const now = Date.now();
    req.session.requests = req.session.requests.filter(time => time > now - windowMs);
    
    if (req.session.requests.length >= maxRequests) {
        return res.status(429).json({ message: 'Too many requests, please try again later' });
    }
    
    req.session.requests.push(now);
    next();
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.use(rateLimit);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
  }
}));

// MongoDB connection
let db;
let contentModerator;

async function connectToMongo() {
  try {
    const client = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017/talkingHelps');
    await client.connect();
    db = client.db();
    contentModerator = new ContentModerator(db);
    console.log('Connected to MongoDB');
    
    // Create indexes
    await db.collection('posts').createIndex({ createdAt: -1 });
    await db.collection('posts').createIndex({ alias: 1 });
    await db.collection('posts').createIndex({ parentPostId: 1 });
    await db.collection('posts').createIndex({ status: 1 });
    await db.collection('reports').createIndex({ contentId: 1, status: 1 });
    await db.collection('reports').createIndex({ createdAt: -1 });
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

// Make db and contentModerator available to routes
app.use((req, res, next) => {
  req.db = db;
  req.contentModerator = contentModerator;
  next();
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/support', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'support.html'));
});

// API Routes
app.get('/api/alias', (req, res) => {
  if (req.session.alias) {
    return res.json({ alias: req.session.alias });
  }
  
  // Generate new alias
  const adjectives = ['Calm', 'Blue', 'Silent', 'Brave', 'Quiet', 'Gentle', 'Wise', 'Kind'];
  const nouns = ['Phoenix', 'Cloud', 'Forest', 'River', 'Owl', 'Star', 'Moon', 'Wind'];
  const randomNum = Math.floor(Math.random() * 999) + 1;
  const alias = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}_${randomNum}`;
  
  req.session.alias = alias;
  res.json({ alias });
});

// Posts API
app.get('/api/posts', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const posts = await db.collection('posts')
            .find({ 
                parentPostId: null,
                status: { $ne: 'hidden' }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await db.collection('posts').countDocuments({ 
            parentPostId: null,
            status: { $ne: 'hidden' }
        });

        res.json({
            posts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Failed to fetch posts:', err);
        res.status(500).json({ message: 'Failed to fetch posts' });
    }
});

app.post('/api/posts', async (req, res) => {
    try {
        if (!req.session.alias) {
            return res.status(401).json({ message: 'No alias found' });
        }

        const { content } = req.body;
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ message: 'Content is required' });
        }

        // Moderate content
        const moderationResult = await req.contentModerator.moderateContent(content);
        if (!moderationResult.allowed) {
            return res.status(400).json({
                message: 'Content violates community guidelines',
                issues: moderationResult.issues
            });
        }

        const post = {
            content: moderationResult.sanitizedContent,
            alias: req.session.alias,
            createdAt: new Date(),
            likes: [],
            commentCount: 0,
            status: 'active'
        };

        const result = await db.collection('posts').insertOne(post);
        post._id = result.insertedId;

        res.status(201).json(post);
    } catch (err) {
        console.error('Failed to create post:', err);
        res.status(500).json({ message: 'Failed to create post' });
    }
});

app.put('/api/posts/:id', filterContent, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ message: 'Content is required' });
        }

        const post = await db.collection('posts').findOne({ _id: new ObjectId(id) });
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (post.alias !== req.session.alias) {
            return res.status(403).json({ message: 'Not authorized to edit this post' });
        }

        const result = await db.collection('posts').updateOne(
            { _id: new ObjectId(id) },
            { $set: { content: content.trim() } }
        );

        if (result.modifiedCount === 0) {
            return res.status(400).json({ message: 'Failed to update post' });
        }

        res.json({ message: 'Post updated successfully' });
    } catch (err) {
        console.error('Failed to update post:', err);
        res.status(500).json({ message: 'Failed to update post' });
    }
});

app.delete('/api/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const post = await db.collection('posts').findOne({ _id: new ObjectId(id) });
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (post.alias !== req.session.alias) {
            return res.status(403).json({ message: 'Not authorized to delete this post' });
        }

        // Delete the post and all its comments
        await db.collection('posts').deleteMany({
            $or: [
                { _id: new ObjectId(id) },
                { parentPostId: id }
            ]
        });

        res.json({ message: 'Post and its comments deleted successfully' });
    } catch (err) {
        console.error('Failed to delete post:', err);
        res.status(500).json({ message: 'Failed to delete post' });
    }
});

app.post('/api/posts/:id/like', async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.session.alias) {
            return res.status(401).json({ message: 'No alias found' });
        }

        const post = await db.collection('posts').findOne({ _id: new ObjectId(id) });
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const likes = post.likes || [];
        const likeIndex = likes.indexOf(req.session.alias);

        if (likeIndex === -1) {
            // Add like
            await db.collection('posts').updateOne(
                { _id: new ObjectId(id) },
                { $push: { likes: req.session.alias } }
            );
        } else {
            // Remove like
            await db.collection('posts').updateOne(
                { _id: new ObjectId(id) },
                { $pull: { likes: req.session.alias } }
            );
        }

        res.json({ message: 'Like toggled successfully' });
    } catch (err) {
        console.error('Failed to toggle like:', err);
        res.status(500).json({ message: 'Failed to toggle like' });
    }
});

// Comments API
app.get('/api/posts/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const comments = await db.collection('posts')
            .find({ parentPostId: id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await db.collection('posts').countDocuments({ parentPostId: id });

        res.json({
            comments,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Failed to fetch comments:', err);
        res.status(500).json({ message: 'Failed to fetch comments' });
    }
});

app.post('/api/comments', async (req, res) => {
    try {
        if (!req.session.alias) {
            return res.status(401).json({ message: 'No alias found' });
        }

        const { postId, content } = req.body;
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ message: 'Content is required' });
        }

        // Check if parent post exists
        const parentPost = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
        if (!parentPost) {
            return res.status(404).json({ message: 'Parent post not found' });
        }

        // Moderate content
        const moderationResult = await req.contentModerator.moderateContent(content, 'comment');
        if (!moderationResult.allowed) {
            return res.status(400).json({
                message: 'Content violates community guidelines',
                issues: moderationResult.issues
            });
        }

        const comment = {
            content: moderationResult.sanitizedContent,
            alias: req.session.alias,
            parentPostId: postId,
            createdAt: new Date(),
            likes: [],
            status: 'active'
        };

        const result = await db.collection('posts').insertOne(comment);
        comment._id = result.insertedId;

        // Update comment count on parent post
        await db.collection('posts').updateOne(
            { _id: new ObjectId(postId) },
            { $inc: { commentCount: 1 } }
        );

        res.status(201).json(comment);
    } catch (err) {
        console.error('Failed to create comment:', err);
        res.status(500).json({ message: 'Failed to create comment' });
    }
});

app.delete('/api/comments/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const comment = await db.collection('posts').findOne({ _id: new ObjectId(id) });
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        if (comment.alias !== req.session.alias) {
            return res.status(403).json({ message: 'Not authorized to delete this comment' });
        }

        // Delete the comment
        await db.collection('posts').deleteOne({ _id: new ObjectId(id) });

        // Update comment count on parent post
        await db.collection('posts').updateOne(
            { _id: new ObjectId(comment.parentPostId) },
            { $inc: { commentCount: -1 } }
        );

        res.json({ message: 'Comment deleted successfully' });
    } catch (err) {
        console.error('Failed to delete comment:', err);
        res.status(500).json({ message: 'Failed to delete comment' });
    }
});

// Profile API
app.get('/api/profile/:type', async (req, res) => {
    try {
        if (!req.session.alias) {
            return res.status(401).json({ message: 'No alias found' });
        }

        const { type } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        let query = {};
        switch (type) {
            case 'posts':
                query = { alias: req.session.alias, parentPostId: null };
                break;
            case 'comments':
                query = { alias: req.session.alias, parentPostId: { $ne: null } };
                break;
            case 'likes':
                query = { likes: req.session.alias };
                break;
            default:
                return res.status(400).json({ message: 'Invalid profile type' });
        }

        const items = await db.collection('posts')
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await db.collection('posts').countDocuments(query);

        res.json({
            items,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Failed to fetch profile items:', err);
        res.status(500).json({ message: 'Failed to fetch profile items' });
    }
});

// Add reporting endpoints
app.post('/api/reports', async (req, res) => {
    try {
        if (!req.session.alias) {
            return res.status(401).json({ message: 'No alias found' });
        }

        const { contentId, reason, category } = req.body;

        if (!contentId || !reason || !category) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        if (!Object.values(CONTENT_CATEGORIES).includes(category)) {
            return res.status(400).json({ message: 'Invalid category' });
        }

        const report = await req.contentModerator.reportContent(
            contentId,
            req.session.alias,
            reason,
            category
        );

        res.status(201).json(report);
    } catch (err) {
        console.error('Failed to create report:', err);
        res.status(500).json({ message: 'Failed to create report' });
    }
});

app.get('/api/reports', async (req, res) => {
    try {
        if (!req.session.alias) {
            return res.status(401).json({ message: 'No alias found' });
        }

        const status = req.query.status || 'pending';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await req.contentModerator.getReports(status, page, limit);
        res.json(result);
    } catch (err) {
        console.error('Failed to fetch reports:', err);
        res.status(500).json({ message: 'Failed to fetch reports' });
    }
});

// Start server
async function startServer() {
  await connectToMongo();
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer(); 