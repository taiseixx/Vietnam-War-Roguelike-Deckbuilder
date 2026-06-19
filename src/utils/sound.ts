// Web Audio API Synthesizer for 1960s Vietnam War Tactical Radios, Choppers, and Battlegrounds

class TacticalSoundEngine {
  private ctx: AudioContext | null = null;
  private helicopterNode: OscillatorNode | null = null;
  private helicopterGain: GainNode | null = null;
  private helicopterThrum: OscillatorNode | null = null;
  public isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopChopperAmbience();
    } else {
      this.startChopperAmbience();
    }
    return this.isMuted;
  }

  // --- HUEY HELICOPTER BACKGROUND THRUM ---
  public startChopperAmbience() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      // Stop existing if running
      this.stopChopperAmbience();

      // Synthesize heavy Huey rotor thrum
      // 1. Low frequency engine rumble
      this.helicopterNode = this.ctx.createOscillator();
      this.helicopterNode.type = 'sawtooth';
      this.helicopterNode.frequency.value = 55; // A1 low frequency

      // 2. Modulator for the ROTOR blades ("thrum-thrum-thrum")
      this.helicopterThrum = this.ctx.createOscillator();
      this.helicopterThrum.type = 'sine';
      this.helicopterThrum.frequency.value = 7.2; // 7.2 Hz rotor speed

      // 3. Routing
      const modulatorGain = this.ctx.createGain();
      modulatorGain.gain.value = 15; // frequency modulation depth

      this.helicopterGain = this.ctx.createGain();
      this.helicopterGain.gain.value = 0.04; // low ambient volume

      // Low pass filter to make it sound muffled and distant inside helmet/radio
      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 180;

      // Connections:
      // Modulator -> ModulatorGain -> Carrier Frequency
      this.helicopterThrum.connect(modulatorGain);
      if (modulatorGain && this.helicopterNode.frequency) {
        modulatorGain.connect(this.helicopterNode.frequency);
      }

      this.helicopterNode.connect(lowpass);
      lowpass.connect(this.helicopterGain);
      this.helicopterGain.connect(this.ctx.destination);

      // Start oscillators
      this.helicopterThrum.start();
      this.helicopterNode.start();
    } catch (e) {
      console.warn('Audio chopper start failed:', e);
    }
  }

  public stopChopperAmbience() {
    try {
      if (this.helicopterNode) {
        this.helicopterNode.stop();
        this.helicopterNode.disconnect();
        this.helicopterNode = null;
      }
      if (this.helicopterThrum) {
        this.helicopterThrum.stop();
        this.helicopterThrum.disconnect();
        this.helicopterThrum = null;
      }
      if (this.helicopterGain) {
        this.helicopterGain.disconnect();
        this.helicopterGain = null;
      }
    } catch (e) {
      // Ignored
    }
  }

  // --- RIFLE GUNSHOT (M16 OR AK47) ---
  public playGunshot() {
    if (this.isMuted) return;
    this.initCtx();
    const actx = this.ctx;
    if (!actx) return;

    try {
      // White noise buffer
      const bufferSize = actx.sampleRate * 0.4; // 0.4 secs
      const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = actx.createBufferSource();
      noiseNode.buffer = buffer;

      const noiseFilter = actx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 800; // sharp gun crack frequency
      noiseFilter.Q.value = 2.0;

      const gainNode = actx.createGain();
      gainNode.gain.setValueAtTime(0.35, actx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.35);

      noiseNode.connect(noiseFilter);
      noiseFilter.connect(gainNode);
      gainNode.connect(actx.destination);

      noiseNode.start();
    } catch (e) {
      // Fail-silent
    }
  }

  // --- TACTICAL RADIO STATIC PRESS ---
  public playRadioStatic() {
    if (this.isMuted) return;
    this.initCtx();
    const actx = this.ctx;
    if (!actx) return;

    try {
      const bufferSize = actx.sampleRate * 0.15; // short radio click
      const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = actx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = actx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;
      filter.Q.value = 3.0;

      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.08, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.12);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);

      noiseNode.start();
    } catch (e) {
      // Fail-silent
    }
  }

  // --- ARTILLERY / NAPALM EXPLOSION ---
  public playExplosion() {
    if (this.isMuted) return;
    this.initCtx();
    const actx = this.ctx;
    if (!actx) return;

    try {
      // Noise component
      const bufferSize = actx.sampleRate * 1.5; // rumble
      const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = actx.createBufferSource();
      noiseNode.buffer = buffer;

      // Heavy lowpass filtering for dense bass shockwave
      const filter = actx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, actx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(30, actx.currentTime + 1.2);

      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.6, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 1.4);

      // Distant secondary blast wave (low sine oscillator)
      const subOsc = actx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(90, actx.currentTime);
      subOsc.frequency.exponentialRampToValueAtTime(10, actx.currentTime + 0.8);

      const subGain = actx.createGain();
      subGain.gain.setValueAtTime(0.5, actx.currentTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.9);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);

      subOsc.connect(subGain);
      subGain.connect(actx.destination);

      noiseNode.start();
      subOsc.start();
      subOsc.stop(actx.currentTime + 1.0);
    } catch (e) {
      // Fail-silent
    }
  }

  // --- TACTICAL CARD SWISH ---
  public playCardDraw() {
    if (this.isMuted) return;
    this.initCtx();
    const actx = this.ctx;
    if (!actx) return;

    try {
      const osc = actx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, actx.currentTime + 0.15);

      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.08, actx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, actx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(actx.destination);

      osc.start();
      osc.stop(actx.currentTime + 0.16);
    } catch (e) {
      // Fail-silent
    }
  }

  // --- DEPLOY CHIRP ---
  public playDeploy() {
    if (this.isMuted) return;
    this.initCtx();
    const actx = this.ctx;
    if (!actx) return;

    try {
      const osc = actx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, actx.currentTime);
      osc.frequency.setValueAtTime(450, actx.currentTime + 0.05);

      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.1, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(actx.destination);

      osc.start();
      osc.stop(actx.currentTime + 0.16);
    } catch (e) {
      // Fail-silent
    }
  }
}

export const sound = new TacticalSoundEngine();
export default sound;
