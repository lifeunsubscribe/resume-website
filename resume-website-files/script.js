document.addEventListener('DOMContentLoaded', function () {
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();

    // Dark mode functionality
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle?.querySelector('i');

    // Check for saved theme preference or use system preference
    const getPreferredTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const setTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    };

    // Initialize theme
    setTheme(getPreferredTheme());

    // Theme toggle click handler
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });

    // Navigation functionality
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    // Function to activate a section by ID
    const activateSection = (sectionId) => {
        const targetSection = document.getElementById(sectionId);
        if (!targetSection) return false;

        // Remove active class from all links and sections
        navLinks.forEach(navLink => navLink.classList.remove('active'));
        sections.forEach(section => section.classList.remove('active-section'));

        // Add active class to corresponding link and section
        const correspondingLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
        if (correspondingLink) correspondingLink.classList.add('active');
        targetSection.classList.add('active-section');

        return true;
    };

    // Check for target section from sessionStorage (set by cross-page navigation)
    // or from inline script that intercepted hash, or from URL hash
    const storedSection = sessionStorage.getItem('targetSection');
    const targetSection = storedSection || window.__targetSection || (window.location.hash ? window.location.hash.substring(1) : null);

    // Clear the stored section after reading
    if (storedSection) {
        sessionStorage.removeItem('targetSection');
    }

    if (targetSection) {
        activateSection(targetSection);

        // Function to scroll to the correct position
        const scrollToTarget = () => {
            const header = document.querySelector('header');
            const scrollTarget = header ? header.offsetHeight - 20 : 0;
            window.scrollTo({ top: scrollTarget, behavior: 'instant' });

            // Update URL to reflect the section
            if (!window.location.hash || window.location.hash.substring(1) !== targetSection) {
                history.replaceState(null, null, '#' + targetSection);
            }
        };

        // If coming from cross-page navigation (sessionStorage), wait for everything to load
        if (storedSection) {
            // Wait for fonts and images, then add a small delay for Safari to settle
            Promise.all([
                document.fonts.ready,
                new Promise(resolve => {
                    const headshot = document.querySelector('.headshot');
                    if (headshot && !headshot.complete) {
                        headshot.addEventListener('load', resolve);
                    } else {
                        resolve();
                    }
                })
            ]).then(() => {
                // Small timeout lets Safari fully complete rendering
                setTimeout(scrollToTarget, 50);
            });
        } else {
            requestAnimationFrame(scrollToTarget);
        }
    }

    // Handle all cross-page hash links (back links, header links, etc.)
    document.querySelectorAll('a[href*="#"]').forEach(link => {
        const href = link.getAttribute('href');
        // Skip if it's a same-page hash link (handled by nav-link handler)
        if (href.startsWith('#')) return;
        // Skip if already has nav-link class (handled above)
        if (link.classList.contains('nav-link')) return;

        // Handle cross-page hash links
        if (href.includes('#')) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const [basePath, hash] = href.split('#');
                sessionStorage.setItem('targetSection', hash);
                window.location.href = basePath || '../';
            });
        }
    });

    // Handle nav link clicks
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            // Only prevent default for same-page navigation (hash links)
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);

                // Update URL hash
                history.pushState(null, null, href);

                // Activate section
                activateSection(targetId);

                // Scroll to show blue header strip at top with nav below
                const header = document.querySelector('header');
                const scrollTarget = header ? header.offsetHeight - 20 : 0;
                window.scrollTo({ top: scrollTarget, behavior: 'instant' });
            }
            // For cross-page navigation with hash (like ../#projects)
            // Intercept and use sessionStorage to avoid Safari's hash scroll behavior
            else if (href.includes('#')) {
                e.preventDefault();
                const [basePath, hash] = href.split('#');
                sessionStorage.setItem('targetSection', hash);
                window.location.href = basePath || '../';
            }
        });
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
        if (window.location.hash) {
            activateSection(window.location.hash.substring(1));
        }
    });

    // Certification buttons functionality
    const certButtons = document.querySelectorAll('.cert-btn');

    certButtons.forEach(button => {
        button.addEventListener('click', function () {
            const credentialId = this.getAttribute('data-credential-id');
            if (credentialId) {
                window.open(`https://cp.certmetrics.com/amazon/en/public/verify/credential/${credentialId}`, '_blank', 'noopener,noreferrer');
            }
        });
    });

    // Animation on scroll
    const animateOnScroll = function () {
        const timelineItems = document.querySelectorAll('.timeline-item');
        const certCards = document.querySelectorAll('.cert-card');

        timelineItems.forEach((item, index) => {
            if (isElementInViewport(item)) {
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });

        certCards.forEach((card, index) => {
            if (isElementInViewport(card)) {
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });
    };

    // Helper function to check if element is in viewport
    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.bottom >= 0
        );
    }

    // Set initial styles for animation
    document.querySelectorAll('.timeline-item').forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });

    document.querySelectorAll('.cert-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });

    // Run animation check on load and scroll
    window.addEventListener('load', animateOnScroll);
    window.addEventListener('scroll', animateOnScroll);
});