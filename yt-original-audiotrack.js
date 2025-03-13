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

    const DESKTOP_REDIR_ENABLED = 'yt_audiotrack_desktop_redirect_enabled';

    function isMobileYT() {
        return (window.location.hostname === 'm.youtube.com' ||
        (window.location.hostname === 'www.youtube.com' &&
        (document.documentElement.classList.contains('mobile'))));
    }

    function isMobileDevice() {
        const userAgent = navigator.userAgent || window.opera;
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
        const touchSupported = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
        return mobileRegex.test(userAgent) || touchSupported;
    }

    function redirectToDesktop() {
        // Check if redirection is enabled in settings
        const redirectEnabled = GM_getValue(DESKTOP_REDIR_ENABLED, true);
        if (!redirectEnabled) return false;

        // Look whether desktop param already in URL
        const hasDesktopParam = window.location.search.includes('app=desktop');
        if (isMobileYT() && !hasDesktopParam) {
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

    // Wait for an element to appear in the DOM
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) return resolve(element);
            const observer = new MutationObserver((mutations, obs) => {
                const target = document.querySelector(selector);
                if (target) {
                    obs.disconnect();
                    resolve(target);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
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

    // Wait until no ad shown
    function waitForNoAds(timeout = 10000) {
        return new Promise((resolve, reject) => {
            const player = document.querySelector('.html5-video-player');
            if (!player || !player.classList.contains('ad-showing')) return resolve();
            const observer = new MutationObserver((mutations, obs) => {
                if (!player.classList.contains('ad-showing')) {
                    obs.disconnect();
                    resolve();
                }
            });
            observer.observe(player, { attributes: true, attributeFilter: ['class'] });
            setTimeout(() => {
                observer.disconnect();
                reject(new Error('Timeout: Ad still showing.'));
            }, timeout);
        });
    }

    function createToggleSwitch() {
        // Only create the switch if we're on a mobile device
        if (!isMobileDevice()) {
            return;
        }

        // Wait for the search bar container to be available
        waitForElement('#masthead-container').then(container => {
            // Check if the switch already exists to prevent duplicates
            if (document.querySelector('.yt-audiotrack-switch-container')) {
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
                padding: 0 5px;
            `;

            // Create the label
            const label = document.createElement('label');
            label.textContent = '';
            label.title = GM_getValue(DESKTOP_REDIRECT_ENABLED, true) ? 'Disable desktop redirect' : 'Enable desktop redirect';
            label.style.cssText = `
                margin-right: 5px;
                color: #aaa;
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
            checkbox.checked = GM_getValue(DESKTOP_REDIR_ENABLED, true);
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
                GM_setValue(DESKTOP_REDIR_ENABLED, this.checked);
                sliderButton.style.transform = this.checked ? 'translateX(16px)' : 'translateX(0)';
                slider.style.backgroundColor = this.checked ? '#FF0000' : '#ccc';

                // If switched to ON, reload the page to apply desktop redirect
                if (this.checked && isMobileYT() && !window.location.search.includes('app=desktop')) {
                    window.location.reload();
                }
            });

            // Set initial color
            slider.style.backgroundColor = checkbox.checked ? '#FF0000' : '#ccc';

            // Assemble the switch
            toggleSwitch.appendChild(checkbox);
            toggleSwitch.appendChild(slider);

            // Assemble the container
            switchContainer.appendChild(label);
            switchContainer.appendChild(toggleSwitch);

            // Find the right place to insert the switch
            const targetLocation = document.querySelector('#end');
            if (targetLocation) {
                // Insert before the end container with YouTube's buttons
                targetLocation.insertBefore(switchContainer, targetLocation.firstChild);
            } else {
                // Fallback: try to insert into the masthead container
                const searchBox = document.querySelector('#masthead-container #search');
                if (searchBox) {
                    // Insert after the search box
                    searchBox.parentNode.insertBefore(switchContainer, searchBox.nextSibling);
                } else {
                    // Final fallback: insert at the end of the masthead container
                    container.appendChild(switchContainer);
                }
            }
        }).catch(error => {
            console.error('Error creating toggle switch:', error);
        });
    }

    // Main function to reset the audiotrack
    async function checkAudiotrack() {
        try {
            if (redirectToDesktop()) {
                return; // Early return to redirect to desktop view
            }

            // Wait for the video element and ensure no ad is playing
            await waitForElement('video');
            await waitForNoAds();

            // Open the settings menu
            const settingsButton = await waitForElement('.ytp-settings-button');
            clickElement(settingsButton);
            const settingsMenu = await waitForElement('.ytp-popup.ytp-settings-menu');

            // Find and click the "Audiotrack" item
            const audioTrackItem = Array.from(settingsMenu.querySelectorAll('.ytp-menuitem'))
                .find(item => item.textContent.includes('Audiotrack'));

            if (audioTrackItem) {
                clickElement(audioTrackItem);

                // Wait for the audiotrack submenu to appear
                const audioTrackMenu = await waitForElement('.ytp-popup.ytp-settings-menu');

                // Click the "Original" option
                const originalOption = Array.from(audioTrackMenu.querySelectorAll('.ytp-menuitem'))
                    .find(item => item.textContent.toLowerCase().includes('original'));

                if (originalOption) {
                    clickElement(originalOption);
                } else {
                    console.warn('"Original" audiotrack not found.');
                }
                // Close settings menu
                clickElement(settingsButton);
            } else {
                console.warn('Audiotrack menu not found.');
                // Close half-open settings menu
                clickElement(settingsButton);
            }
        } catch (error) {
            console.error('Error in script:', error);
        }
    }

    // Initial trigger on page load
    window.addEventListener('yt-navigate-finish', function() {
        createToggleSwitch();
        checkAudiotrack();
    });

    // Make sure we run on the initial page load too
    window.addEventListener('load', function() {
        createToggleSwitch();
        checkAudiotrack();
    });

    // Try to create the toggle as early as possible
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(createToggleSwitch, 1000);
    }
})();
