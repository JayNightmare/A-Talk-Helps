// Global state
let currentAlias = null;
let currentTab = 'posts';

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContent = document.getElementById('tab-content');

// Initialize
async function init() {
    try {
        const response = await fetch('/api/alias');
        const data = await response.json();
        currentAlias = data.alias;
        loadTabContent(currentTab);
    } catch (err) {
        console.error('Failed to initialize:', err);
        showError('Failed to connect to server. Please refresh the page.');
    }
}

// Load tab content
async function loadTabContent(tab) {
    try {
        const response = await fetch(`/api/profile/${tab}`);
        const data = await response.json();
        renderTabContent(tab, data);
    } catch (err) {
        console.error(`Failed to load ${tab}:`, err);
        showError(`Failed to load ${tab}. Please try again.`);
    }
}

// Render tab content
function renderTabContent(tab, data) {
    if (!data || data.length === 0) {
        tabContent.innerHTML = `
            <div class="empty-state">
                <p>You haven't ${tab === 'posts' ? 'posted anything' : 
                    tab === 'comments' ? 'commented on anything' : 
                    'liked anything'} yet.</p>
                ${tab === 'posts' ? '<a href="/" class="post-submit-btn">Write your first post</a>' : ''}
            </div>
        `;
        return;
    }

    tabContent.innerHTML = data.map(item => {
        if (tab === 'posts') {
            return `
                <div class="profile-item" data-id="${item._id}">
                    <div class="profile-item-header">
                        <span class="timestamp">${formatTimestamp(item.createdAt)}</span>
                        <div class="profile-item-actions">
                            <button onclick="editPost('${item._id}')">Edit</button>
                            <button class="delete" onclick="deletePost('${item._id}')">Delete</button>
                        </div>
                    </div>
                    <div class="profile-item-content">${escapeHtml(item.content)}</div>
                    <div class="profile-item-stats">
                        <span>${item.likes?.length || 0} likes</span>
                        <span>${item.commentCount || 0} comments</span>
                    </div>
                </div>
            `;
        } else if (tab === 'comments') {
            return `
                <div class="profile-item" data-id="${item._id}">
                    <div class="profile-item-header">
                        <span class="timestamp">${formatTimestamp(item.createdAt)}</span>
                        <div class="profile-item-actions">
                            <button class="delete" onclick="deleteComment('${item._id}')">Delete</button>
                        </div>
                    </div>
                    <div class="profile-item-content">${escapeHtml(item.content)}</div>
                    <div class="profile-item-context">
                        On post: ${escapeHtml(item.parentPostContent || 'Post not found')}
                    </div>
                </div>
            `;
        } else { // likes
            return `
                <div class="profile-item" data-id="${item._id}">
                    <div class="profile-item-header">
                        <span class="timestamp">${formatTimestamp(item.createdAt)}</span>
                    </div>
                    <div class="profile-item-content">${escapeHtml(item.content)}</div>
                    <div class="profile-item-context">
                        By: ${escapeHtml(item.alias)}
                    </div>
                </div>
            `;
        }
    }).join('');
}

// Edit post
async function editPost(postId) {
    const postElement = document.querySelector(`[data-id="${postId}"]`);
    const content = postElement.querySelector('.profile-item-content').textContent;
    
    postElement.innerHTML = `
        <div class="profile-item-edit">
            <textarea class="edit-text">${escapeHtml(content)}</textarea>
            <div class="edit-actions">
                <button onclick="saveEdit('${postId}')">Save</button>
                <button onclick="cancelEdit('${postId}')">Cancel</button>
            </div>
        </div>
    `;
}

// Save edit
async function saveEdit(postId) {
    const postElement = document.querySelector(`[data-id="${postId}"]`);
    const content = postElement.querySelector('.edit-text').value.trim();

    if (!content) {
        showError('Post cannot be empty');
        return;
    }

    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            throw new Error('Failed to update post');
        }

        loadTabContent(currentTab);
    } catch (err) {
        console.error('Failed to update post:', err);
        showError('Failed to update post. Please try again.');
    }
}

// Cancel edit
function cancelEdit(postId) {
    loadTabContent(currentTab);
}

// Delete post
async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) {
        return;
    }

    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete post');
        }

        loadTabContent(currentTab);
    } catch (err) {
        console.error('Failed to delete post:', err);
        showError('Failed to delete post. Please try again.');
    }
}

// Delete comment
async function deleteComment(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) {
        return;
    }

    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete comment');
        }

        loadTabContent(currentTab);
    } catch (err) {
        console.error('Failed to delete comment:', err);
        showError('Failed to delete comment. Please try again.');
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

function showError(message) {
    tabContent.innerHTML = `
        <div class="error-state">
            <p>${escapeHtml(message)}</p>
            <button onclick="loadTabContent(currentTab)">Try Again</button>
        </div>
    `;
}

// Event listeners
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        if (tab === currentTab) return;

        // Update active state
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Load new content
        currentTab = tab;
        loadTabContent(tab);
    });
});

// Initialize the app
init(); 