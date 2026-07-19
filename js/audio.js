let _sharedAudioCtx = null;

class AudioSystem {
    constructor() {
        // Initialize Web Audio Context on first interaction to comply with browser policies
        this.audioCtx = _sharedAudioCtx;
        this.initialized = !!_sharedAudioCtx;

        // Listen to first user interaction to unlock audio
        const initAudio = () => {
            if (!this.initialized) {
                if (!_sharedAudioCtx) {
                    _sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                this.audioCtx = _sharedAudioCtx;
                this.initialized = true;
                window.removeEventListener('click', initAudio);
                window.removeEventListener('keydown', initAudio);
            }
        };
        window.addEventListener('click', initAudio);
        window.addEventListener('keydown', initAudio);
    }

    play(soundName) {
        if (!this.initialized || !this.audioCtx) return;

        switch (soundName) {
            case 'fire':
                this._playSynth('sine', 400, 800, 0.1, 0.05);
                break;
            case 'snap':
                this._playSynth('triangle', 600, 600, 0.1, 0.05);
                break;
            case 'match':
                // A quick happy arpeggio for matching
                this._playSynth('sine', 523.25, 523.25, 0.1, 0.1, 0); // C5
                this._playSynth('sine', 659.25, 659.25, 0.1, 0.1, 0.05); // E5
                this._playSynth('sine', 783.99, 783.99, 0.1, 0.1, 0.1); // G5
                this._playSynth('sine', 1046.50, 1046.50, 0.1, 0.2, 0.15); // C6
                break;
            case 'drop':
                // A descending slide
                this._playSynth('sine', 800, 200, 0.3, 0.2);
                break;
            case 'push':
                // A low thud
                this._playSynth('square', 150, 50, 0.2, 0.3);
                break;
            case 'gameover':
                // A sad descending tone
                this._playSynth('sawtooth', 300, 100, 0.5, 0.5, 0);
                this._playSynth('sawtooth', 250, 80, 0.5, 0.5, 0.4);
                break;
        }
    }

    _playSynth(type, startFreq, endFreq, duration, volume, delay = 0) {
        const time = this.audioCtx.currentTime + delay;
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = type;

        // Frequency Envelope
        osc.frequency.setValueAtTime(startFreq, time);
        if (startFreq !== endFreq) {
            osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);
        }

        // Amplitude Envelope (ADSR ish)
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(volume, time + duration * 0.1); // Attack
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration); // Decay/Release

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.onended = () => {
            gainNode.disconnect();
        };

        osc.start(time);
        osc.stop(time + duration);
    }
}
