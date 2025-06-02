// Sidebar toggle logic
const sidebar = document.getElementById('sidebar');
const sidebarMenu = document.getElementById('sidebar-menu');
const openSidebarButton = document.getElementById('openSidebar');
const closeSidebarButton = document.getElementById('closeSidebar');

// Create overlay element
const overlay = document.createElement('div');
overlay.className = 'sidebar-overlay';
document.body.appendChild(overlay);

// Initially hide sidebar menu
sidebarMenu.classList.add('hide-elements');

// Function to open sidebar
function openSidebar() {
    sidebar.classList.add('open');
    sidebarMenu.classList.remove('hide-elements');
    sidebar.setAttribute('aria-expanded', 'true');
    overlay.classList.add('active');
    openSidebarButton.classList.add('hide-elements');
    document.body.style.overflow = 'hidden'; // Prevent scrolling when sidebar is open
}

// Function to close sidebar
function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarMenu.classList.add('hide-elements');
    sidebar.setAttribute('aria-expanded', 'false');
    overlay.classList.remove('active');
    openSidebarButton.classList.remove('hide-elements');
    document.body.style.overflow = ''; // Restore scrolling
}

// Open sidebar
openSidebarButton.addEventListener('click', openSidebar);

// Close sidebar
closeSidebarButton.addEventListener('click', closeSidebar);

// Close on overlay click
overlay.addEventListener('click', closeSidebar);

// Close on Escape key press
document.addEventListener('keydown', function(event) {
    if (event.code === 'Escape' || event.key === 'Escape') {
        if (sidebar.classList.contains('open')) {
            closeSidebar();
        }
    }
});
