document.addEventListener('DOMContentLoaded', function () {
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();

    // Navigation functionality
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            // Remove active class from all links and sections
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active-section'));

            // Add active class to clicked link
            this.classList.add('active');

            // Show corresponding section
            const targetId = this.getAttribute('href').substring(1);
            document.getElementById(targetId).classList.add('active-section');

            // Smooth scroll to section
            document.getElementById(targetId).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Experience details toggle
    const detailButtons = document.querySelectorAll('.details-btn');

    detailButtons.forEach(button => {
        button.addEventListener('click', function () {
            const detailsContent = this.nextElementSibling;
            detailsContent.classList.toggle('active');

            // Change button text
            if (detailsContent.classList.contains('active')) {
                this.textContent = 'Hide Details';
            } else {
                this.textContent = 'More Details';
            }
        });
    });

    // Certification buttons functionality
    const certButtons = document.querySelectorAll('.cert-btn');

    certButtons.forEach(button => {
        button.addEventListener('click', function () {
            if (confirm('Opening Credential Verification Page\n Validation number: a998fd11d9f3463baf26c8a32f4b140e\n Verify anytime at: https://aws.amazon.com/verification/')) {
                window.open('https://cp.certmetrics.com/amazon/en/public/verify/credential/a998fd11d9f3463baf26c8a32f4b140e', '_blank');

            };
        });
    });

    // Headshot hover effect
    const headshotContainer = document.querySelector('.headshot-container');

    headshotContainer.addEventListener('mouseenter', function () {
        this.style.transform = 'scale(1.05)';
    });

    headshotContainer.addEventListener('mouseleave', function () {
        this.style.transform = 'scale(1)';
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