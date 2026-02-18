// Sound notification manager (ICQ-style)

class SoundManager {
  constructor() {
    this.enabled = localStorage.getItem('soundsEnabled') !== 'false';
    this.volume = parseFloat(localStorage.getItem('soundVolume') || '0.5');
  }

  // Generate simple beep sounds using Web Audio API
  playBeep(frequency = 800, duration = 100) {
    if (!this.enabled) return;

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(this.volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.error('Sound playback error:', error);
    }
  }

  // ICQ-style "UH OH!" message received sound
  messageReceived() {
    this.playBeep(600, 80);
    setTimeout(() => this.playBeep(400, 100), 100);
  }

  // Message sent sound
  messageSent() {
    this.playBeep(800, 60);
    setTimeout(() => this.playBeep(1000, 60), 80);
  }

  // Contact online notification
  contactOnline() {
    this.playBeep(1000, 100);
    setTimeout(() => this.playBeep(1200, 100), 120);
    setTimeout(() => this.playBeep(1400, 100), 240);
  }

  // Contact offline notification
  contactOffline() {
    this.playBeep(800, 100);
    setTimeout(() => this.playBeep(600, 100), 120);
  }

  // New contact added
  contactAdded() {
    this.playBeep(1200, 80);
    setTimeout(() => this.playBeep(1400, 80), 100);
  }

  // Error sound
  error() {
    this.playBeep(300, 200);
  }

  // Settings
  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem('soundsEnabled', enabled);
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('soundVolume', this.volume);
  }

  isEnabled() {
    return this.enabled;
  }

  getVolume() {
    return this.volume;
  }
}

// Singleton instance
const soundManager = new SoundManager();

export default soundManager;
