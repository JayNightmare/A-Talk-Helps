// Global state
let currentAlias = null;

// DOM Elements
const newPostText = document.getElementById('new-post-text');
const newPostError = document.getElementById('new-post-error');
const postSubmitBtn = document.querySelector('.post-submit-btn');
const feed = document.getElementById('feed');

// Initialize
async function init() {
    try {
        const response = await fetch('/api/alias');
        const data = await response.json();
        currentAlias = data.alias;
        loadPosts();
    } catch (err) {
        console.error('Failed to initialize:', err);
        newPostError.textContent = 'Failed to connect to server. Please refresh the page.';
    }
}

// Load posts
async function loadPosts() {
    try {
        const response = await fetch('/api/posts');
        const posts = await response.json();
        renderPosts(posts);
    } catch (err) {
        console.error('Failed to load posts:', err);
    }
}

// Render posts
function renderPosts(posts) {
    feed.innerHTML = posts.map(post => `
        <div class="post-card" data-postid="${post._id}">
            <div class="post-header">
                <span class="alias">${escapeHtml(post.alias)}</span>
                <span class="timestamp">${formatTimestamp(post.createdAt)}</span>
            </div>
            <div class="post-content">${escapeHtml(post.content)}</div>
            <div class="post-actions">
                <button class="like-btn" onclick="toggleLike('${post._id}')">
                    Like (<span class="like-count">${post.likes?.length || 0}</span>)
                </button>
                <button class="toggle-comment-section-btn" onclick="toggleComments('${post._id}')">
                    Comment
                </button>
                <button class="report-btn" onclick="showReportDialog('${post._id}')">
                    Report
                </button>
            </div>
            <div class="comments-container hidden" id="comments-${post._id}">
                <!-- Comments will be loaded here -->
            </div>
        </div>
    `).join('');
}

// Create new post
async function createPost(content) {
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create post');
        }

        const post = await response.json();
        newPostText.value = '';
        loadPosts(); // Reload all posts
    } catch (err) {
        console.error('Failed to create post:', err);
        newPostError.textContent = err.message;
    }
}

// Toggle like
async function toggleLike(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/like`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to toggle like');
        }

        loadPosts(); // Reload to update like count
    } catch (err) {
        console.error('Failed to toggle like:', err);
    }
}

// Toggle comments section
async function toggleComments(postId) {
    const commentsContainer = document.getElementById(`comments-${postId}`);
    if (commentsContainer.classList.contains('hidden')) {
        try {
            const response = await fetch(`/api/posts/${postId}/comments`);
            const comments = await response.json();
            
            commentsContainer.innerHTML = `
                ${comments.map(comment => `
                    <div class="comment">
                        <div class="comment-header">
                            <span class="alias">${escapeHtml(comment.alias)}</span>
                            <span class="timestamp">${formatTimestamp(comment.createdAt)}</span>
                        </div>
                        <div class="comment-content">${escapeHtml(comment.content)}</div>
                        <div class="comment-actions">
                            <button class="report-btn" onclick="showReportDialog('${comment._id}')">
                                Report
                            </button>
                        </div>
                    </div>
                `).join('')}
                <textarea class="comment-text" placeholder="Write a comment..."></textarea>
                <button class="comment-submit-btn" onclick="submitComment('${postId}')">Submit</button>
            `;
            
            commentsContainer.classList.remove('hidden');
        } catch (err) {
            console.error('Failed to load comments:', err);
        }
    } else {
        commentsContainer.classList.add('hidden');
    }
}

// Submit comment
async function submitComment(postId) {
    const commentsContainer = document.getElementById(`comments-${postId}`);
    const commentText = commentsContainer.querySelector('.comment-text');
    const content = commentText.value.trim();

    if (!content) return;

    try {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                postId,
                content
            })
        });

        if (!response.ok) {
            throw new Error('Failed to submit comment');
        }

        commentText.value = '';
        toggleComments(postId); // Reload comments
    } catch (err) {
        console.error('Failed to submit comment:', err);
    }
}

// Show report dialog
function showReportDialog(contentId) {
    const dialog = document.createElement('div');
    dialog.className = 'report-dialog';
    dialog.innerHTML = `
        <div class="report-dialog-content">
            <h3>Report Content</h3>
            <select id="report-category">
                <option value="harmful">Harmful Content</option>
                <option value="spam">Spam</option>
                <option value="inappropriate">Inappropriate Content</option>
                <option value="hate_speech">Hate Speech</option>
            </select>
            <textarea id="report-reason" placeholder="Please explain why you're reporting this content..."></textarea>
            <div class="report-dialog-actions">
                <button onclick="submitReport('${contentId}')">Submit Report</button>
                <button onclick="closeReportDialog()">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
}

// Close report dialog
function closeReportDialog() {
    const dialog = document.querySelector('.report-dialog');
    if (dialog) {
        dialog.remove();
    }
}

// Submit report
async function submitReport(contentId) {
    const category = document.getElementById('report-category').value;
    const reason = document.getElementById('report-reason').value.trim();

    if (!reason) {
        alert('Please provide a reason for reporting');
        return;
    }

    try {
        const response = await fetch('/api/reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contentId,
                category,
                reason
            })
        });

        if (!response.ok) {
            throw new Error('Failed to submit report');
        }

        closeReportDialog();
        alert('Thank you for your report. Our moderators will review it shortly.');
    } catch (err) {
        console.error('Failed to submit report:', err);
        alert('Failed to submit report. Please try again.');
    }
}

// Utility functions
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        if (hours === 0) {
            const minutes = Math.floor(diff / (60 * 1000));
            return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
        }
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }
    
    // Less than 7 days
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        return `${days} day${days === 1 ? '' : 's'} ago`;
    }
    
    // Otherwise show date
    return date.toLocaleDateString();
}

// Event listeners
postSubmitBtn.addEventListener('click', () => {
    const content = newPostText.value.trim();
    if (!content) {
        newPostError.textContent = 'Please enter some content';
        return;
    }
    if (content.length > 1000) {
        newPostError.textContent = 'Post must be 1000 characters or less';
        return;
    }
    newPostError.textContent = '';
    createPost(content);
});

// Initialize the app
init(); 