/********************************************************************
 **                          Nebula Audio                          **
 *? HTMLAudioElement interface wrapper that adds a few convenience  *
 *?        methods and jQuery-like event listener management        *
 **                       Tristan Gauci, 2022                       *
*********************************************************************/
export default class NebulaAudio {
    constructor(url) {
        this._audio = new Audio(url);
        if (url) this._audio.load();
        this._eventHandlers = {};
    }
    play = () => this._audio.play()
    pause = () => this._audio.pause()
    stop() {
        this._audio.pause();
        this._audio.currentTime = 0;
    }
    toggle() {
        this._audio.paused
            ? this.play()
            : this.stop()
    }
    get isPlaying() {
        return !this._audio.paused
    }
    get loop() {
        return this._audio.loop
    }
    set loop(willLoop) {
        return this._audio.loop = willLoop
    }
    get src() {
        return this._audio.src
    }
    
    /**
     * Setter changes the current audio track with a 1.5 second swing fade. Takes a URL to an audio file.
     * @param {string} url - The URL of the audio file to play.
     */
    set src(url) {
        const fadeMs = 1500;
        this.setVolume(0, fadeMs).then(() => {
            const isPlaying = this.isPlaying;
            this._audio.src = url;
            if (isPlaying) this._audio.play();
            this.setVolume(100, fadeMs);
        });
    }

    /**
     * Changes the audio volume with a swing fade algorithm. Takes a new volume (0-100), a fade duration (ms), and an interval (ms) and returns a promise
     * that resolves when the fade is complete
     * @param {number} newVolume - The new volume to set the audio to.
     * @param {number} [fadeMs=1500] - The amount of time in milliseconds to fade the volume over.
     * @param {number} [intervalMs=13] - The interval in milliseconds between each volume change.
     * @returns A promise that resolves when the volume has been set.
     */
    async setVolume(newVolume, fadeMs = 1500, intervalMs = 13) {

        // If new volume is out of bounds, reject the promise with an error
        if (newVolume < 0 || newVolume > 100) return Promise.reject(new Error('New volume is outside of allowed range (0-100)'));

        newVolume /= 100; // Divide by 100 since the HTMLAudioElement interface accepts a 0-1 float for volume

        const originalVolume = this._audio.volume;
        const delta = newVolume - originalVolume;
    
        // If the new volume is the same as current volume, or there's no fade duration or interval, skip the fade effect
        if (!delta || !fadeMs || !intervalMs) {
            this._audio.volume = newVolume;
            return Promise.resolve();
        }
    
        // Calculate number of ticks to complete fade & set iterator
        const ticks = Math.floor(fadeMs / intervalMs);
        let tick = 1;
    
        return new Promise(resolve => {
            const timer = setInterval(() => {
                this._audio.volume = originalVolume + ((0.5 - Math.cos((tick / ticks) * Math.PI) / 2) * delta);

                // Iterate tick and if fade has completed, break loop and resolve promise
                if (++tick === ticks + 1) {
                    clearInterval(timer);
                    resolve();
                }
            }, intervalMs);
        });
    }

    /********************************************************************
     **                         Event Handling                         **
     *      jQuery-like HTMLAudioElement event listener management      *
    *********************************************************************/
    /**
     * Adds an event listener to the NebulaAudio instance
     * @param {string} event Name of the HTMLAudioElement event to add a listener to
     * @param {function} handler Handler function to execute when the event fires
     * @returns {number} Returns index of handler function in this._eventHandlers[event] array. Can be passed to this.off to remove the listener.
     *
     * @example on('ended', () => { console.log('Event Fired') })
     */
    on(event, handler) {
        const eventHandlers = this._eventHandlers[event] || [];
        eventHandlers.push(handler);
        this._audio.addEventListener(event, eventHandlers[eventHandlers.length - 1]);
        this._eventHandlers[event] = eventHandlers;
        return eventHandlers.length - 1;
    }

    /**
     * Removes all listeners associated with an event from the NebulaAudio instance, or optionally a specific listener if handlerIndex is specified
     * @param {string} event Name of the HTMLAudioElement event to remove listeners from
     * @param {number} [handlerIndex] Index of the handler in this._eventHandlers[event] array to remove. If not specified, all listeners associated with the event will be removed.
     *
     * @example off('ended')
     */
    off(event, handlerIndex) {
        const eventHandlers = this._eventHandlers[event];
        if (!eventHandlers || !eventHandlers.length) return;

        if (handlerIndex !== undefined) {
            // If a handlerIndex is specified, remove the listener associated with that handler
            this._audio.removeEventListener(event, eventHandlers[handlerIndex]);
            eventHandlers[handlerIndex] = null; // Instead of splicing out the array element entirely, we'll just null the function to the preserve the index structure.
        } else {
            // If no handlerIndex is specified, remove all listeners on the specified event
            eventHandlers.forEach((handler, index) => {
                this._audio.removeEventListener(event, handler);
                eventHandlers[index] = null; // Instead of splicing out the array element entirely, we'll just null the function to the preserve the index structure.
            });
        }

        this._eventHandlers[event] = eventHandlers;
    }

}