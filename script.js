/* ===========================
   ParkPing — Application Logic
   =========================== */

(function () {
    'use strict';

    // ===========================
    // Configuration
    // ===========================
    const CONFIG = {
        // Storage keys
        STORAGE_KEY: 'parkping_owner_data',
        EMAILJS_KEY: 'parkping_emailjs',

        // Default owner data (pre-configured)
        DEFAULT_OWNER: {
            name: 'Kashish Gupta',
            vehicle: '',
            email: '',
            phone: '9716549157'
        },

        // EmailJS Defaults
        EMAILJS_DEFAULT: {
            serviceId: 'service_vt2t6vh',
            templateId: 'template_owcbjfv',
            publicKey: 'r73yX6A55YSEuRl9N'
        },

        // QR Code settings
        QR_SIZE: 200,
        QR_SIZE_PRINT: 150,
        QR_DARK: '#1a1a2e',
        QR_LIGHT: '#ffffff'
    };

    // ===========================
    // State
    // ===========================
    let currentChip = null;

    // ===========================
    // Utility Functions
    // ===========================

    function $(selector) {
        return document.querySelector(selector);
    }

    function $all(selector) {
        return document.querySelectorAll(selector);
    }

    function showToast(message, type = 'info') {
        const toast = $('#toast');
        toast.textContent = message;
        toast.className = 'toast ' + type;
        // Force reflow
        void toast.offsetWidth;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function getOwnerData() {
        try {
            const data = localStorage.getItem(CONFIG.STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch { return null; }
    }

    function saveOwnerData(data) {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
    }

    function getEmailJSConfig() {
        try {
            const data = localStorage.getItem(CONFIG.EMAILJS_KEY);
            return data ? JSON.parse(data) : null;
        } catch { return null; }
    }

    function saveEmailJSConfig(config) {
        localStorage.setItem(CONFIG.EMAILJS_KEY, JSON.stringify(config));
    }

    function getContactURL() {
        const base = window.location.href.split('?')[0].split('#')[0];
        return base + '?contact';
    }

    function isContactView() {
        return window.location.search.includes('contact');
    }

    // ===========================
    // View Routing
    // ===========================

    function initApp() {
        if (isContactView()) {
            showContactView();
        } else {
            showOwnerView();
        }
    }

    // ===========================
    // OWNER VIEW
    // ===========================

    function showOwnerView() {
        $('#owner-view').style.display = 'block';
        $('#contact-view').style.display = 'none';

        // Pre-fill from localStorage or defaults
        const saved = getOwnerData();
        const data = saved || CONFIG.DEFAULT_OWNER;

        $('#owner-name').value = data.name || '';
        $('#vehicle-number').value = data.vehicle || '';
        $('#owner-email').value = data.email || '';
        $('#owner-phone').value = data.phone || '';

        // Pre-fill EmailJS config (use saved or defaults)
        const emailjsConfig = getEmailJSConfig() || CONFIG.EMAILJS_DEFAULT;
        if (emailjsConfig) {
            $('#emailjs-public-key').value = emailjsConfig.publicKey || '';
            $('#emailjs-service-id').value = emailjsConfig.serviceId || '';
            $('#emailjs-template-id').value = emailjsConfig.templateId || '';
        }

        // If already configured, show QR immediately
        if (saved && saved.vehicle) {
            generateQR(saved);
        }

        // Form submission
        $('#setup-form').addEventListener('submit', handleSetupSubmit);

        // Button handlers
        $('#download-qr-btn').addEventListener('click', downloadQR);
        $('#preview-btn').addEventListener('click', previewContact);
        $('#reset-btn').addEventListener('click', resetSetup);
    }

    function handleSetupSubmit(e) {
        e.preventDefault();

        const data = {
            name: $('#owner-name').value.trim(),
            vehicle: $('#vehicle-number').value.trim().toUpperCase(),
            email: $('#owner-email').value.trim(),
            phone: $('#owner-phone').value.trim()
        };

        if (!data.name || !data.vehicle || !data.email || !data.phone) {
            showToast('Please fill all fields', 'error');
            return;
        }

        // Save EmailJS config
        const emailjsConfig = {
            publicKey: $('#emailjs-public-key').value.trim(),
            serviceId: $('#emailjs-service-id').value.trim(),
            templateId: $('#emailjs-template-id').value.trim()
        };
        saveEmailJSConfig(emailjsConfig);

        // Save owner data
        saveOwnerData(data);

        // Generate QR
        generateQR(data);

        showToast('✅ QR Code generated!', 'success');
    }

    function generateQR(data) {
        const qrSection = $('#qr-section');
        qrSection.style.display = 'block';

        // Scroll to QR section
        setTimeout(() => qrSection.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);

        // Set vehicle label
        $('#qr-vehicle-label').textContent = data.vehicle;

        // Generate main QR
        const qrContainer = $('#qrcode');
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: getContactURL(),
            width: CONFIG.QR_SIZE,
            height: CONFIG.QR_SIZE,
            colorDark: CONFIG.QR_DARK,
            colorLight: CONFIG.QR_LIGHT,
            correctLevel: QRCode.CorrectLevel.H
        });

        // Generate print QR
        const printQrContainer = $('#print-qr');
        printQrContainer.innerHTML = '';
        new QRCode(printQrContainer, {
            text: getContactURL(),
            width: CONFIG.QR_SIZE_PRINT,
            height: CONFIG.QR_SIZE_PRINT,
            colorDark: CONFIG.QR_DARK,
            colorLight: CONFIG.QR_LIGHT,
            correctLevel: QRCode.CorrectLevel.H
        });

        // Set print vehicle number
        $('#print-vehicle').textContent = data.vehicle;
    }

    function downloadQR() {
        const canvas = $('#qrcode canvas');
        if (!canvas) {
            // Fallback: try img
            const img = $('#qrcode img');
            if (img) {
                const link = document.createElement('a');
                link.download = 'parkping-qr.png';
                link.href = img.src;
                link.click();
            }
            return;
        }

        // Create a larger canvas for better print quality
        const data = getOwnerData();
        const padding = 40;
        const textHeight = 80;
        const totalWidth = canvas.width + padding * 2;
        const totalHeight = canvas.height + padding * 2 + textHeight;

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = totalWidth * 2; // 2x for retina
        exportCanvas.height = totalHeight * 2;
        const ctx = exportCanvas.getContext('2d');
        ctx.scale(2, 2);

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.roundRect(0, 0, totalWidth, totalHeight, 16);
        ctx.fill();

        // Draw QR
        ctx.drawImage(canvas, padding, padding);

        // Draw text
        ctx.fillStyle = '#6366f1';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Scan to Contact Owner', totalWidth / 2, canvas.height + padding + 24);

        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.fillText(data ? data.vehicle : '', totalWidth / 2, canvas.height + padding + 50);

        ctx.fillStyle = '#888888';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText('ParkPing • No number revealed', totalWidth / 2, canvas.height + padding + 70);

        // Download
        const link = document.createElement('a');
        link.download = 'parkping-qr-' + (data ? data.vehicle.replace(/\s/g, '-') : 'code') + '.png';
        link.href = exportCanvas.toDataURL('image/png');
        link.click();

        showToast('📥 QR Code downloaded!', 'success');
    }

    function previewContact() {
        window.open(getContactURL(), '_blank');
    }

    function resetSetup() {
        if (confirm('Reset all data? This will clear your saved configuration.')) {
            localStorage.removeItem(CONFIG.STORAGE_KEY);
            localStorage.removeItem(CONFIG.EMAILJS_KEY);
            location.reload();
        }
    }

    // ===========================
    // CONTACT VIEW (Public Page)
    // ===========================

    function showContactView() {
        $('#owner-view').style.display = 'none';
        $('#contact-view').style.display = 'block';

        const ownerData = getOwnerData();

        if (ownerData && ownerData.vehicle) {
            $('#contact-vehicle-num').textContent = ownerData.vehicle;
        } else {
            $('#contact-vehicle-num').textContent = 'Vehicle';
        }

        // Chip selection
        $all('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                $all('.chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                currentChip = chip.textContent.trim();

                // Pre-fill message
                const messageField = $('#sender-message');
                const messages = {
                    'Car is blocking': 'Hi, your car is blocking my way. Could you please move it? Thank you!',
                    'Lights are on': 'Hi, your car lights are on. Thought I should let you know!',
                    'Emergency': 'Hi, there is an emergency situation with your car. Please check urgently!',
                    'Other': ''
                };
                if (messages[currentChip] !== undefined) {
                    messageField.value = messages[currentChip];
                }
            });
        });

        // Contact form submission
        $('#contact-form').addEventListener('submit', handleContactSubmit);
    }

    async function handleContactSubmit(e) {
        e.preventDefault();

        const senderName = $('#sender-name').value.trim();
        const senderPhone = $('#sender-phone').value.trim();
        const senderMessage = $('#sender-message').value.trim();

        if (!senderName || !senderPhone || !senderMessage) {
            showToast('Please fill all fields', 'error');
            return;
        }

        const sendBtn = $('#send-btn');
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span class="spinner"></span> Sending...';

        const ownerData = getOwnerData();
        // Use saved config or defaults
        const emailjsConfig = getEmailJSConfig() || CONFIG.EMAILJS_DEFAULT;

        // Try EmailJS if configured
        if (emailjsConfig && emailjsConfig.publicKey && emailjsConfig.serviceId && emailjsConfig.templateId) {
            try {
                emailjs.init(emailjsConfig.publicKey);

                await emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, {
                    owner_name: ownerData ? ownerData.name : 'Car Owner',
                    owner_email: ownerData ? ownerData.email : '',
                    vehicle_number: ownerData ? ownerData.vehicle : 'Unknown',
                    sender_name: senderName,
                    sender_phone: senderPhone,
                    sender_message: senderMessage,
                    reason: currentChip || 'General',
                    to_email: ownerData ? ownerData.email : ''
                });

                showSuccess();
                return;
            } catch (err) {
                console.error('EmailJS error:', err);
                // Fall through to fallback
            }
        }

        // Fallback: Use WhatsApp (with owner's consent — number stored locally)
        if (ownerData && ownerData.phone) {
            const whatsappMessage = encodeURIComponent(
                `🚗 ParkPing Alert!\n\n` +
                `Vehicle: ${ownerData.vehicle}\n` +
                `Reason: ${currentChip || 'General'}\n\n` +
                `From: ${senderName}\n` +
                `Phone: ${senderPhone}\n\n` +
                `Message: ${senderMessage}`
            );

            // Open WhatsApp with pre-filled message
            const whatsappURL = `https://wa.me/91${ownerData.phone}?text=${whatsappMessage}`;
            window.open(whatsappURL, '_blank');

            showSuccess();
            return;
        }

        // If nothing is configured
        showToast('⚠️ Contact method not configured. Please try again later.', 'error');
        sendBtn.disabled = false;
        sendBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="m22 2-11 11"/></svg> Send Message`;
    }

    function showSuccess() {
        $('#contact-form').style.display = 'none';
        $('.action-chips').style.display = 'none';
        $('#success-state').style.display = 'block';
    }

    // ===========================
    // Initialize
    // ===========================

    document.addEventListener('DOMContentLoaded', initApp);

})();
