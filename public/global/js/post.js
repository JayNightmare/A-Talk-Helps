// * This file is part of the Open Source Social Network (OSSN)
// * Open Source Social Network is an open source social networking software


// //
// ! Post Tags Management

function addTagToList(tagInputId, tagListId) {
    const tagInput = document.getElementById(tagInputId);
    const tagList = document.getElementById(tagListId);

    if (tagInput && tagList) {
        const tagValue = tagInput.value.trim();

        if (tagValue) {
            const tagElement = document.createElement('li');
            tagElement.textContent = tagValue;

            const removeButton = document.createElement('button');
            removeButton.textContent = 'x';
            removeButton.onclick = () => tagList.removeChild(tagElement);

            tagElement.appendChild(removeButton);
            tagList.appendChild(tagElement);

            tagInput.value = '';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const addButton = document.getElementById('addTagButton');
    if (addButton) {
        addButton.addEventListener('click', () => addTagToList('postTags', 'tagList'));
    }
});

// //

// ! Send Post to MongoDB server
function sendPostToServer(postData) {
    fetch('/api/posts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Post sent successfully:', data);
            // Optionally, you can clear the form or update the UI
        } else {
            console.error('Error sending post:', data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}
