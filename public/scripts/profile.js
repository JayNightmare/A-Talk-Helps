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
                <span>📭</span>
                <p>You haven't ${tab === 'posts' ? 'posted anything' : 
                    tab === 'comments' ? 'commented on anything' : 
                    'liked anything'} yet.</p>
                ${tab === 'posts' ? '<a href="./index.html" class="support-btn">Write your first post</a>' : ''}
            </div>
        `;
        return;
    }

    tabContent.innerHTML = data.map(item => {
        if (tab === 'posts') {
            return `
                <div class="activity-card" data-id="${item._id}">
                    <div class="activity-header">
                        <span class="activity-type">📝 Post</span>
                        <span class="activity-timestamp">${formatTimestamp(item.createdAt)}</span>
                    </div>
                    <div class="activity-content">${escapeHtml(item.content)}</div>
                    <div class="activity-meta">
                        <span>❤️ ${item.likes?.length || 0} likes</span>
                        <span>💬 ${item.commentCount || 0} comments</span>
                        <button onclick="editPost('${item._id}')" style="background: none; border: none; color: var(--discord-accent); cursor: pointer;">✏️ Edit</button>
                        <button onclick="deletePost('${item._id}')" style="background: none; border: none; color: var(--discord-red); cursor: pointer;">🗑️ Delete</button>
                    </div>
                </div>
            `;
        } else if (tab === 'comments') {
            return `
                <div class="activity-card" data-id="${item._id}">
                    <div class="activity-header">
                        <span class="activity-type">💬 Comment</span>
                        <span class="activity-timestamp">${formatTimestamp(item.createdAt)}</span>
                    </div>
                    <div class="activity-content">${escapeHtml(item.content)}</div>
                    <div class="activity-meta">
                        <span>On: ${escapeHtml(item.parentPostContent || 'Post not found')}</span>
                        <button onclick="deleteComment('${item._id}')" style="background: none; border: none; color: var(--discord-red); cursor: pointer;">🗑️ Delete</button>
                    </div>
                </div>
            `;
        } else { // likes
            return `
                <div class="activity-card" data-id="${item._id}">
                    <div class="activity-header">
                        <span class="activity-type">❤️ Liked Post</span>
                        <span class="activity-timestamp">${formatTimestamp(item.createdAt)}</span>
                    </div>
                    <div class="activity-content">${escapeHtml(item.content)}</div>
                    <div class="activity-meta">
                        <span>By: ${escapeHtml(item.alias)}</span>
                    </div>
                </div>
            `;
        }
    }).join('');
}

// Edit post
async function editPost(postId) {
    const postElement = document.querySelector(`[data-id="${postId}"]`);
    const content = postElement.querySelector('.activity-content').textContent;
    
    postElement.innerHTML = `
        <div class="activity-header">
            <span class="activity-type">✏️ Editing Post</span>
        </div>
        <div class="edit-container">
            <textarea class="edit-text" style="
                width: 100%;
                min-height: 100px;
                padding: 0.75rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                background-color: var(--discord-darkest);
                color: var(--discord-light);
                margin-bottom: 1rem;
                resize: vertical;
                font-family: inherit;
            ">${escapeHtml(content)}</textarea>
            <div class="edit-actions" style="display: flex; gap: 0.5rem;">
                <button onclick="saveEdit('${postId}')" style="
                    background-color: var(--discord-accent);
                    color: var(--discord-lighter);
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                ">💾 Save Changes</button>
                <button onclick="cancelEdit('${postId}')" style="
                    background-color: var(--discord-darker);
                    color: var(--discord-light);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                ">❌ Cancel</button>
            </div>
        </div>
    `;

    // Focus the textarea
    const textarea = postElement.querySelector('.edit-text');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
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
        <div class="error-state" style="
            text-align: center;
            padding: 3rem 1rem;
            color: var(--discord-red);
        ">
            <span style="
                font-size: 3rem;
                display: block;
                margin-bottom: 1rem;
            ">⚠️</span>
            <p style="margin-bottom: 1.5rem;">${escapeHtml(message)}</p>
            <button onclick="loadTabContent(currentTab)" style="
                background-color: var(--discord-accent);
                color: var(--discord-lighter);
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
            ">🔄 Try Again</button>
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

// Logout function
async function handleLogout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            window.location.href = '/login';
        } else {
            console.error('Logout failed');
        }
    } catch (err) {
        console.error('Logout error:', err);
    }
}

// Initialize the app
init();
