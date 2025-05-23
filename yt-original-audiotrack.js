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
// @grant           none
// @run-at          document-start
// @compatible      firefox
// @compatible      edge
// @compatible      safari
// ==/UserScript==

(function() {
    'use strict';

    function redirectToDesktop() {
        // Check if we're on m.youtube.com or in a mobile setting
        const isMobile = window.location.hostname === 'm.youtube.com' || 
                                (window.location.hostname === 'www.youtube.com' && 
                                (document.documentElement.classList.contains('mobile')));
        // Look whether desktop param already in URL
        const hasDesktopParam = window.location.search.includes('app=desktop');
        if (isMobile && !hasDesktopParam) {
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
    checkAudiotrack();

    // Re-run the script after SPA navigation events (when switching videos)
    document.addEventListener('yt-navigate-finish', () => {
        checkAudiotrack();
    });
})();
