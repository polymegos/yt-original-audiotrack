// ==UserScript==
// @name            YouTube Audiotrack Reset
// @version         0.1.1
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
// @compatible      chrome
// @compatible      firefox
// @compatible      opera
// @compatible      edge
// @compatible      safari
// ==/UserScript==

(function() {
    'use strict';
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

    function clickElement(element) {
        if (element) {
            element.click();
        }
    }

    // Check audiotrack option
    async function checkAudiotrack() {
        try {
            // Wait for the video
            const video = await waitForElement('video');

            // Open, wait for settings menu
            const settingsButton = await waitForElement('.ytp-settings-button');
            clickElement(settingsButton);
            const settingsMenu = await waitForElement('.ytp-popup.ytp-settings-menu');

            // Click "Audiotrack" item
            const audioTrackItem = Array.from(settingsMenu.querySelectorAll('.ytp-menuitem')).find(item =>
                item.textContent.includes('Audiotrack')
            );

            if (audioTrackItem) {
                clickElement(audioTrackItem);

                // Await Audiotrack submenu
                const audioTrackMenu = await waitForElement('.ytp-popup.ytp-settings-menu');

                // Click "Original" option
                const originalOption = Array.from(audioTrackMenu.querySelectorAll('.ytp-menuitem')).find(item =>
                    item.textContent.includes('Original')
                );

                if (originalOption) {
                    clickElement(originalOption);
                } else {
                    console.warn('"Original" audiotrack not found.');
                }
                // Close settings menu
                clickElement(settingsButton);
            } else {
                console.warn('Audiotrack menu not found.');

                // Close half-way settings menu
                clickElement(settingsButton);
            }
        } catch (error) {
            console.error('Error in script:', error);
        }
    }

    const observer = new MutationObserver((mutations, obs) => {
        const videoPlayer = document.querySelector('.html5-video-player.playing-mode');
        if (videoPlayer) {
            obs.disconnect();
            checkAudiotrack();
        }
    });

    observer.observe(document, { childList: true, subtree: true });
})();
