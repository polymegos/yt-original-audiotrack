// ==UserScript==
// @name            YouTube Audiotrack Reset
// @version         0.1.4
// @description     Overrides automatic use of generated, translated audiotracks on YouTube videos. Resets to original audio.
// @author          PolyMegos (https://github.com/polymegos)
// @namespace       https://github.com/polymegos/yt-original-audiotrack/
// @supportURL      https://github.com/polymegos/yt-original-audiotrack/issues
// @license         MIT
// @match           *://www.youtube.com/*
// @match           *://www.youtube-nocookie.com/*
// @match           *://m.youtube.com/*
// @match           *://music.youtube.com/*
// @grant           GM_setValue
// @grant           GM_getValue
// @run-at          document-start
// @compatible      firefox
// @compatible      edge
// @compatible      safari
// ==/UserScript==

(function() {
    'use strict';

    // Storage keys
    const DESKTOP_REDIRECT_ENABLED = 'yt_audiotrack_desktop_redirect_enabled';

    // Flag to track if we're on a video page
    let isVideoPage = false;

    // Flag to track if we've already added the toggle switch
    let switchAdded = false;

    // Flag to track if we've already processed the current video
    let currentVideoProcessed = false;

    // Current video ID
    let currentVideoId = null;

    // Observers
    let mastheadObserver = null;

    // Check if we're on a mobile device
    function isMobile() {
        return window.location.hostname === 'm.youtube.com' ||
               (window.location.hostname === 'www.youtube.com' &&
               (document.documentElement.classList.contains('mobile') ||
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)));
    }

    // Check if we're on a video page
    function checkIsVideoPage() {
        const oldIsVideoPage = isVideoPage;
        isVideoPage = window.location.href.includes('watch?v=');

        // Get the current video ID
        const videoIdMatch = window.location.href.match(/[?&]v=([^&]+)/);
        const newVideoId = videoIdMatch ? videoIdMatch[1] : null;

        // If the video ID has changed, reset the processed flag
        if (newVideoId !== currentVideoId) {
            currentVideoId = newVideoId;
            currentVideoProcessed = false;
        }

        return isVideoPage !== oldIsVideoPage; // Return true if it changed
    }

    function redirectToDesktop() {
        // Only redirect if we're on mobile AND the setting is enabled
        const redirectEnabled = GM_getValue(DESKTOP_REDIRECT_ENABLED, true); // Default to true

        // Check if we're on mobile
        const onMobile = window.location.hostname === 'm.youtube.com' ||
                        (window.location.hostname === 'www.youtube.com' &&
                        document.documentElement.classList.contains('mobile'));

        // Look whether desktop param already in URL
        const hasDesktopParam = window.location.search.includes('app=desktop');

        if (onMobile && redirectEnabled && !hasDesktopParam) {
            // Appending desktop parameter for new URL
            let newUrl = window.location.href;
            if (newUrl.includes('?')) {
                newUrl += '&app=desktop';
            } else {
                newUrl += '?app=desktop';
            }
            // Redirect to desktop version
            console.log('Redirecting to desktop version of YouTube...');
            window.location.href = newUrl;
            return true; // redirect
        }
        return false; // no redirect needed
    }

    function waitForElement(selector, rootElement = document.body, timeout = 7500) {
        return new Promise((resolve, reject) => {
            // First check if the element already exists
            const element = rootElement.querySelector(selector);
            if (element) return resolve(element);

            // If not, set up an observer
            const observer = new MutationObserver(() => {
                const element = rootElement.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(rootElement, { childList: true, subtree: true });

            // Set a timeout to avoid infinite waiting
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout: Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    // Simulate a click on the given element
    function clickElement(element) {
        if (element) {
            element.click();
        }
    }

    function waitForNoAds(timeout = 7500) {
        return new Promise((resolve, reject) => {
            const player = document.querySelector('.html5-video-player');

            // If there's no player or no ad, resolve immediately
            if (!player || !player.classList.contains('ad-showing')) {
                return resolve();
            }

            // Set up an observer for ad changes
            const observer = new MutationObserver(() => {
                if (!player.classList.contains('ad-showing')) {
                    observer.disconnect();
                    resolve();
                }
            });

            observer.observe(player, { attributes: true, attributeFilter: ['class'] });

            // Set a timeout to avoid infinite waiting
            setTimeout(() => {
                observer.disconnect();
                resolve(); // Still resolve, just log a warning
                console.warn('Timeout: Ad still showing after timeout, proceeding anyway.');
            }, timeout);
        });
    }

    // Create and insert the toggle switch
    function createToggleSwitch() {
        // Only create the switch if we're on a mobile device and haven't added it yet
        if (!isMobile() || switchAdded) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            // Function to create and insert the switch
            const insertSwitch = (masthead) => {
                // Check if the switch already exists
                if (document.querySelector('.yt-audiotrack-switch-container')) {
                    switchAdded = true;
                    resolve();
                    return;
                }

                // Create the switch container
                const switchContainer = document.createElement('div');
                switchContainer.className = 'yt-audiotrack-switch-container';
                switchContainer.style.cssText = `
                    display: flex;
                    align-items: center;
                    margin-left: 10px;
                    margin-right: 10px;
                    font-size: 12px;
                    height: 40px;
                `;

                // Create the switch
                const toggleSwitch = document.createElement('label');
                toggleSwitch.className = 'yt-audiotrack-switch';
                toggleSwitch.style.cssText = `
                    position: relative;
                    display: inline-block;
                    width: 36px;
                    height: 20px;
                `;

                // Create the checkbox
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = GM_getValue(DESKTOP_REDIRECT_ENABLED, true);
                checkbox.style.cssText = `
                    opacity: 0;
                    width: 0;
                    height: 0;
                `;

                // Create the slider
                const slider = document.createElement('span');
                slider.className = 'yt-audiotrack-slider';
                slider.style.cssText = `
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: .4s;
                    border-radius: 34px;
                `;

                // Add the slider button
                const sliderButton = document.createElement('span');
                sliderButton.style.cssText = `
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 2px;
                    bottom: 2px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                    transform: ${checkbox.checked ? 'translateX(16px)' : 'translateX(0)'};
                `;
                slider.appendChild(sliderButton);

                // Add event listener
                checkbox.addEventListener('change', function() {
                    GM_setValue(DESKTOP_REDIRECT_ENABLED, this.checked);
                    sliderButton.style.transform = this.checked ? 'translateX(16px)' : 'translateX(0)';
                    slider.style.backgroundColor = this.checked ? '#FF0000' : '#ccc';

                    // If switched to ON, reload the page to apply desktop redirect
                    if (this.checked && !window.location.search.includes('app=desktop')) {
                        window.location.reload();
                    }
                });

                // Set initial color
                slider.style.backgroundColor = checkbox.checked ? '#FF0000' : '#ccc';

                // Assemble the switch
                toggleSwitch.appendChild(checkbox);
                toggleSwitch.appendChild(slider);

                // Assemble the container
                switchContainer.appendChild(toggleSwitch);

                // Find the right place to insert the switch in ytd-masthead
                const searchBox = masthead.querySelector('#search');

                if (searchBox) {
                    // Insert after the search box
                    searchBox.parentNode.insertBefore(switchContainer, searchBox.nextSibling);
                } else {
                    // Fallback: Try to insert at the end of the masthead's center section
                    const centerSection = masthead.querySelector('#center');
                    if (centerSection) {
                        centerSection.appendChild(switchContainer);
                    } else {
                        // Last resort: append to the masthead directly
                        masthead.appendChild(switchContainer);
                    }
                }

                switchAdded = true;
                resolve();
            };

            // Try to find the masthead immediately
            const masthead = document.querySelector('ytd-masthead');
            if (masthead) {
                insertSwitch(masthead);
                return;
            }

            // If masthead isn't available yet, observe for it
            if (!mastheadObserver) {
                mastheadObserver = new MutationObserver((mutations) => {
                    const masthead = document.querySelector('ytd-masthead');
                    if (masthead) {
                        insertSwitch(masthead);

                        // Don't disconnect the observer yet, we might need it
                        // for subsequent SPA navigation
                    }
                });
                mastheadObserver.observe(document.body, { childList: true, subtree: true });

                // Set a timeout to avoid infinite observation
                setTimeout(() => {
                    if (!switchAdded) {
                        console.warn('Timeout: ytd-masthead not found after 5 seconds');
                        resolve();
                    }
                }, 5000);
            }
        });
    }

    // Main function to reset the audiotrack
    async function checkAudiotrack() {
        // Only run this function if we're on a video page and haven't processed this video yet
        if (!isVideoPage || currentVideoProcessed) {
            return;
        }

        try {
            if (redirectToDesktop()) {
                return; // Early return to redirect to desktop view
            }

            // Mark as processed immediately to avoid multiple simultaneous attempts
            currentVideoProcessed = true;

            // Wait for the video element and ensure no ad is playing
            const video = await waitForElement('video', document.body, 5000);
            await waitForNoAds(5000);

            // Open the settings menu
            const settingsButton = await waitForElement('.ytp-settings-button', document.body, 5000);
            clickElement(settingsButton);

            // Wait for the settings menu to appear
            const settingsMenu = await waitForElement('.ytp-popup.ytp-settings-menu', document.body, 3000);

            // Find and click the "Audiotrack" item
            const audioTrackItem = Array.from(settingsMenu.querySelectorAll('.ytp-menuitem'))
                .find(item => item.textContent.includes('Audiotrack'));

            if (audioTrackItem) {
                clickElement(audioTrackItem);

                // Wait for the audiotrack submenu to appear
                const audioTrackMenu = await waitForElement('.ytp-popup.ytp-settings-menu', document.body, 3000);

                // Click the "Original" option
                const originalOption = Array.from(audioTrackMenu.querySelectorAll('.ytp-menuitem'))
                    .find(item => item.textContent.toLowerCase().includes('original'));

                if (originalOption) {
                    clickElement(originalOption);
                } else {
                    console.warn('"Original" audiotrack not found.');
                }
                // Close settings menu (wait a bit for menu to close naturally)
                setTimeout(() => {
                    clickElement(settingsButton);
                }, 500);
            } else {
                console.warn('Audiotrack menu not found.');
                // Close half-open settings menu
                clickElement(settingsButton);
            }
        } catch (error) {
            console.error('Error in script:', error);
            // Reset processed flag if there was an error
            currentVideoProcessed = false;
        }
    }

    // Handle page navigation
    function handlePageNavigation() {
        const pageChanged = checkIsVideoPage();

        // Always try to create the toggle switch
        createToggleSwitch().then(() => {
            // Only run audiotrack check on video pages
            if (isVideoPage) {
                checkAudiotrack();
            }
        });
    }

    // Initial setup
    function initialize() {
        checkIsVideoPage();

        // Try to create the toggle switch
        createToggleSwitch().then(() => {
            // Only run audiotrack check on video pages
            if (isVideoPage) {
                checkAudiotrack();
            }
        });

        // Listen for page navigation events
        document.addEventListener('yt-navigate-finish', handlePageNavigation);

        // Also watch for URL changes
        let lastUrl = window.location.href;
        new MutationObserver(() => {
            if (lastUrl !== window.location.href) {
                lastUrl = window.location.href;
                handlePageNavigation();
            }
        }).observe(document, { subtree: true, childList: true });
    }

    // Run the initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
