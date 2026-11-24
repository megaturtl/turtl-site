(() => {
    const RADIO_URL = 'https://radio.turtl.cc';
    const widget = document.getElementById('now-playing');
    if (!widget) return;

    const artist = document.getElementById('artist');
    const track = document.getElementById('track');
    const separator = document.getElementById('separator');
    const date = document.getElementById('date');
    const trackTooltip = document.getElementById('track-tooltip');
    const cover = document.getElementById('album-cover');
    const controls = document.getElementById('radio-controls');
    const toggle = document.getElementById('radio-toggle');
    const message = document.getElementById('radio-message');
    const audio = document.getElementById('radio-audio');
    const supported = Boolean(audio.canPlayType('audio/ogg; codecs="opus"'));
    let sourceState = 'idle';
    let coverVersion = null;
    let infoKey = '';
    let listening = false;
    let playbackAttempt = 0;
    let pollTimer;
    let infoRequest;
    let coverRequest;
    let coverUrl;

    function updateToggle() {
        controls.hidden = sourceState === 'idle';
        toggle.disabled = !supported || (!listening && sourceState !== 'playing');
        toggle.textContent = listening ? '(stop)' : '(tune in)';
        toggle.setAttribute('aria-label', listening ? 'Stop radio' : 'Tune in to the radio');
        toggle.setAttribute('aria-pressed', String(listening));
    }

    function setMessage(text) {
        message.textContent = supported ? text : 'This browser cannot play Ogg/Opus radio.';
    }

    function stopListening(text = '') {
        listening = false;
        playbackAttempt++;
        audio.pause();
        // Pausing alone keeps the live connection and its old audio buffer.
        audio.removeAttribute('src');
        audio.load();
        updateToggle();
        setMessage(text);
    }

    toggle.addEventListener('click', async () => {
        if (listening) {
            stopListening();
            return;
        }

        listening = true;
        const attempt = ++playbackAttempt;
        updateToggle();
        setMessage('connecting…');
        // Assign the source and call play inside the user gesture, not after a fetch.
        audio.src = `${RADIO_URL}/stream`;
        try {
            await audio.play();
        } catch (error) {
            if (attempt !== playbackAttempt) return;
            stopListening(error.name === 'NotAllowedError'
                ? 'Playback was blocked. Please try again.'
                : 'Could not connect. Please try again.');
        }
    });

    audio.addEventListener('playing', () => {
        if (listening) setMessage('listening live');
    });
    audio.addEventListener('waiting', () => {
        if (listening) setMessage('buffering…');
    });
    audio.addEventListener('error', () => {
        if (listening) stopListening('Radio unavailable. Please try again.');
    });
    audio.addEventListener('ended', () => {
        if (listening) stopListening('Stream ended.');
    });
    audio.addEventListener('pause', () => {
        if (listening && audio.paused) stopListening();
    });

    async function updateCover(version) {
        coverRequest?.abort();
        coverRequest = null;
        cover.hidden = true;
        cover.removeAttribute('src');
        if (coverUrl) URL.revokeObjectURL(coverUrl);
        coverUrl = null;
        if (!version) return;

        const controller = new AbortController();
        coverRequest = controller;
        try {
            const response = await fetch(`${RADIO_URL}/cover?v=${encodeURIComponent(version)}`, {
                cache: 'no-store',
                signal: controller.signal
            });
            if (!response.ok) return;
            const image = await response.blob();
            if (coverRequest !== controller) return;
            coverUrl = URL.createObjectURL(image);
            cover.src = coverUrl;
        } catch {
            if (coverRequest === controller) cover.hidden = true;
        } finally {
            if (coverRequest === controller) coverRequest = null;
        }
    }

    cover.addEventListener('load', () => {
        cover.hidden = !coverUrl;
    });
    cover.addEventListener('error', () => {
        cover.hidden = true;
    });

    function formatLastPlayed(timestamp) {
        const minutes = Math.floor((Date.now() / 1000 - timestamp) / 60);
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
        return `${Math.floor(minutes / 1440)}d ago`;
    }

    function renderInfo(data) {
        sourceState = data.state;
        const hasTrack = Boolean(data.title);
        const nextTrackKey = hasTrack ? JSON.stringify([data.title, data.artists, data.album]) : '';
        const nextInfoKey = JSON.stringify([sourceState, nextTrackKey]);
        if (nextInfoKey !== infoKey) {
            infoKey = nextInfoKey;
            const artists = hasTrack ? data.artists : [];
            const mainArtist = artists[0] || '';
            artist.textContent = mainArtist;
            artist.hidden = !mainArtist;
            separator.hidden = !mainArtist;
            track.textContent = hasTrack ? data.title : 'nothing right now';
            trackTooltip.firstElementChild.textContent = hasTrack ? [artists.join(', '), data.title, data.album].filter(Boolean).join(' - ') : '';
            trackTooltip.hidden = !hasTrack;
            cover.alt = data.album ? `Cover of ${data.album}` : 'Track artwork';
        }

        let status = '';
        if (hasTrack) {
            if (sourceState === 'playing') status = '(live)';
            if (sourceState === 'paused') status = '(paused)';
            if (sourceState === 'idle' && Number.isFinite(data.lastPlayedAt)) {
                status = `(${formatLastPlayed(data.lastPlayedAt)})`;
            }
        }
        if (date.textContent !== status) date.textContent = status;

        const nextCoverVersion = hasTrack ? data.coverVersion : null;
        if (nextCoverVersion !== coverVersion) {
            coverVersion = nextCoverVersion;
            updateCover(coverVersion);
        }

        if (window.turtlControls) {
            const state = sourceState === 'playing' ? 'BOP' : 'IDLE';
            if (window.turtlControls.getCurrentState() !== state) {
                window.turtlControls.setTurtlState(state);
            }
        }
        if (sourceState === 'idle' && listening) stopListening();
        else updateToggle();
        widget.classList.add('fade-in');
    }

    async function pollInfo() {
        clearTimeout(pollTimer);
        const controller = new AbortController();
        infoRequest = controller;
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(`${RADIO_URL}/info`, {
                cache: 'no-store',
                signal: controller.signal
            });
            if (!response.ok) throw new Error(`Radio info: HTTP ${response.status}`);
            const data = await response.json();
            if (infoRequest === controller && !document.hidden) renderInfo(data);
        } catch (error) {
            if (infoRequest !== controller || document.hidden) return;
            renderInfo({ state: 'unavailable' });
            track.textContent = 'radio unavailable';
        } finally {
            clearTimeout(timeout);
            if (infoRequest === controller) {
                infoRequest = null;
                if (!document.hidden) pollTimer = setTimeout(pollInfo, 5000);
            }
        }
    }

    function stopUpdates() {
        clearTimeout(pollTimer);
        infoRequest?.abort();
        infoRequest = null;
    }

    document.addEventListener('visibilitychange', () => {
        stopUpdates();
        if (!document.hidden) pollInfo();
    });
    window.addEventListener('pagehide', () => {
        stopUpdates();
        stopListening();
    });
    window.addEventListener('pageshow', event => {
        if (event.persisted && !document.hidden) pollInfo();
    });

    setMessage('');
    updateToggle();
    if (!document.hidden) pollInfo();
})();
