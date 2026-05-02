import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup?version=3.0';
import GdkPixbuf from 'gi://GdkPixbuf';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Slider from 'resource:///org/gnome/shell/ui/slider.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import ScrollingLabel from './helpers/ScrollingLabel.js';

export default class MusicAssistantExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._session = new Soup.Session();
        this._ws = null;
        this._messageId = 1;
        this._playerState = {
            title: 'Not Playing',
            artist: 'Music Assistant',
            status: 'stopped',
            artUrl: null,
            volume: 0,
        };

        this._createPanelButton();
        this._connectToMA();

        this._settings.connect('changed::server-url', () => this._reconnect());
        this._settings.connect('changed::player-id', () => this._reconnect());
        this._settings.connect('changed::show-panel-title', () => this._updatePanelVisibility());
        
        this._updatePanelVisibility();
    }

    disable() {
        this._disconnect();
        if (this._panelButton) {
            this._panelButton.destroy();
            this._panelButton = null;
        }
        this._settings = null;
        this._session = null;
    }

    _createPanelButton() {
        this._panelButton = new PanelMenu.Button(0.5, 'Music Assistant', false);
        
        let box = new St.BoxLayout({ style_class: 'panel-button-box' });
        
        this._icon = new St.Icon({
            icon_name: 'audio-x-generic-symbolic',
            style_class: 'ma-panel-icon',
            icon_size: 16
        });
        box.add_child(this._icon);

        this._label = new ScrollingLabel({
            text: 'Music Assistant',
            width: 150,
            isScrolling: true
        });
        box.add_child(this._label);

        this._panelButton.add_child(box);
        
        this._panelButton.menu.box.add_style_class_name('popup-menu-container');
        
        this._menuContent = new St.BoxLayout({
            vertical: true,
            style_class: 'ma-menu-box'
        });
        
        let menuItem = new PopupMenu.PopupBaseMenuItem({ activate: false });
        menuItem.add_child(this._menuContent);
        this._panelButton.menu.addMenuItem(menuItem);

        this._buildMenu();
        Main.panel.addToStatusArea('music-assistant-control', this._panelButton);
    }

    _updatePanelVisibility() {
        if (!this._label) return;
        let showTitle = this._settings.get_boolean('show-panel-title');
        this._label.visible = showTitle;
    }

    _buildMenu() {
        // Album Art Button
        this._menuArt = new St.Button({
            style_class: 'ma-art-button',
            x_align: Clutter.ActorAlign.CENTER,
            reactive: true
        });
        this._menuArtIcon = new St.Icon({
            icon_name: 'audio-x-generic-symbolic',
            icon_size: 200,
            style_class: 'ma-art-icon'
        });
        this._menuArt.set_child(this._menuArtIcon);
        this._menuArt.connect('clicked', () => {
            let usePwa = this._settings.get_boolean('use-pwa-command');
            if (usePwa) {
                try {
                    let cmd = this._settings.get_string('pwa-command');
                    if (cmd) {
                        GLib.spawn_command_line_async(cmd);
                    }
                } catch (e) {
                    console.error('Music Assistant: Failed to launch custom command', e);
                }
            } else {
                let url = this._settings.get_string('server-url');
                if (url) Gio.AppInfo.launch_default_for_uri(url, null);
            }
        });
        this._menuContent.add_child(this._menuArt);

        // Info
        let infoBox = new St.BoxLayout({ 
            vertical: true, 
            style_class: 'ma-track-info',
            x_align: Clutter.ActorAlign.CENTER 
        });
        
        this._menuTitle = new ScrollingLabel({
            text: 'No Track',
            width: 250,
            isScrolling: true
        });
        this._menuTitle.add_style_class_name('ma-track-title');
        infoBox.add_child(this._menuTitle);

        this._menuArtist = new St.Label({
            text: 'Music Assistant',
            style_class: 'ma-track-artist',
            x_align: Clutter.ActorAlign.CENTER
        });
        infoBox.add_child(this._menuArtist);
        
        this._menuContent.add_child(infoBox);

        // Volume Slider
        let volumeBox = new St.BoxLayout({ 
            style_class: 'ma-volume-box',
            vertical: false 
        });
        let volIcon = new St.Icon({
            icon_name: 'audio-volume-high-symbolic',
            icon_size: 16,
            style_class: 'ma-volume-icon'
        });
        volumeBox.add_child(volIcon);

        this._volumeSlider = new Slider.Slider(0);
        this._volumeSlider.x_expand = true;
        this._volumeSlider.connect('notify::value', () => {
            if (this._isUpdatingVolume) return;
            this._onVolumeChanged();
        });
        volumeBox.add_child(this._volumeSlider);
        this._menuContent.add_child(volumeBox);

        // Controls
        let controlsBox = new St.BoxLayout({ 
            style_class: 'ma-controls-box',
            x_align: Clutter.ActorAlign.CENTER 
        });
        
        let prevBtn = this._createControlBtn('media-skip-backward-symbolic', () => this._sendCommand('players/cmd/previous'));
        this._playPauseBtn = this._createControlBtn('media-playback-start-symbolic', () => this._togglePlay());
        let nextBtn = this._createControlBtn('media-skip-forward-symbolic', () => this._sendCommand('players/cmd/next'));

        controlsBox.add_child(prevBtn);
        controlsBox.add_child(this._playPauseBtn);
        controlsBox.add_child(nextBtn);

        this._menuContent.add_child(controlsBox);
    }

    _createControlBtn(iconName, callback) {
        let btn = new St.Button({ style_class: 'ma-control-icon' });
        let icon = new St.Icon({ icon_name: iconName, icon_size: 32 });
        btn.set_child(icon);
        btn.connect('clicked', callback);
        return btn;
    }

    _connectToMA() {
        let serverUrl = this._settings.get_string('server-url').replace(/\/$/, '');
        if (!serverUrl) return;

        let wsUrl = serverUrl.replace(/^http/, 'ws') + '/ws';
        let message = Soup.Message.new('GET', wsUrl);

        this._session.websocket_connect_async(message, null, null, GLib.PRIORITY_DEFAULT, null, (session, res) => {
            try {
                this._ws = session.websocket_connect_finish(res);
                this._ws.connect('message', (ws, type, data) => this._onMessage(data));
                this._ws.connect('closed', () => this._onClosed());
                
                this._authenticate();
                this._subscribeToEvents();
                this._fetchCurrentState();
            } catch (e) {
                console.error('Music Assistant: Connection failed', e);
                this._scheduleReconnect();
            }
        });
    }

    _disconnect() {
        if (this._ws) {
            this._ws.close(Soup.WebsocketCloseCode.NORMAL, 'Disconnecting');
            this._ws = null;
        }
    }

    _reconnect() {
        this._disconnect();
        this._connectToMA();
    }

    _scheduleReconnect() {
        if (this._reconnectId) return;
        this._reconnectId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () => {
            this._reconnectId = null;
            this._connectToMA();
            return GLib.SOURCE_REMOVE;
        });
    }

    _onClosed() {
        this._ws = null;
        this._scheduleReconnect();
    }

    _onMessage(data) {
        let text = new TextDecoder().decode(data.toArray());
        let msg = JSON.parse(text);
        
        if (msg.event === 'player_updated' || msg.event === 'queue_updated') {
            this._processPlayerData(msg.data);
        } else if (msg.message_id && msg.result) {
            if (Array.isArray(msg.result)) {
                let playerId = this._settings.get_string('player-id');
                let player = msg.result.find(p => p.player_id === playerId);
                if (player) this._processPlayerData(player);
            } else if (msg.result.player_id) {
                this._processPlayerData(msg.result);
            }
        }
    }

    _authenticate() {
        let token = this._settings.get_string('auth-token');
        if (token) {
            this._sendRaw({
                command: 'auth',
                args: { token },
                message_id: this._messageId++
            });
        }
    }

    _subscribeToEvents() {
        this._sendRaw({
            command: 'subscribe_events',
            message_id: this._messageId++
        });
    }

    _fetchCurrentState() {
        this._sendRaw({
            command: 'players/all',
            message_id: this._messageId++
        });
    }

    _processPlayerData(data) {
        let playerId = this._settings.get_string('player-id');
        if (playerId && data.player_id !== playerId) return;

        let media = data.current_media;
        
        this._playerState.title = media?.title || 'Nothing playing';
        this._playerState.artist = media?.artist || 'Music Assistant';
        this._playerState.status = data.state || 'stopped';
        this._playerState.volume = data.volume_level || 0;
        
        let newArtUrl = media?.image_url || null;
        let serverUrl = this._settings.get_string('server-url').replace(/\/$/, '');
        
        if (newArtUrl && !newArtUrl.startsWith('http')) {
            newArtUrl = serverUrl + newArtUrl;
        }

        if (this._playerState.artUrl !== newArtUrl) {
            this._playerState.artUrl = newArtUrl;
            this._updateArt();
        }

        this._syncUI();
    }

    _syncUI() {
        if (!this._label) return;

        this._label.updateText(this._playerState.title);
        this._menuTitle.updateText(this._playerState.title);
        this._menuArtist.text = this._playerState.artist;

        let isPlaying = this._playerState.status === 'playing';
        this._playPauseBtn.get_child().icon_name = isPlaying 
            ? 'media-playback-pause-symbolic' 
            : 'media-playback-start-symbolic';

        this._isUpdatingVolume = true;
        this._volumeSlider.value = this._playerState.volume / 100;
        this._isUpdatingVolume = false;
    }

    async _updateArt() {
        if (!this._playerState.artUrl) {
            this._menuArtIcon.icon_name = 'audio-x-generic-symbolic';
            this._menuArtIcon.gicon = null;
            return;
        }

        try {
            let message = Soup.Message.new('GET', this._playerState.artUrl);
            
            let token = this._settings.get_string('auth-token');
            if (token) {
                message.request_headers.append('Authorization', `Bearer ${token}`);
            }

            let bytes = await this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
            
            if (message.get_status() !== 200) return;

            let stream = Gio.MemoryInputStream.new_from_bytes(bytes);
            
            let pixbuf = await new Promise((resolve, reject) => {
                GdkPixbuf.Pixbuf.new_from_stream_async(stream, null, (obj, res) => {
                    try {
                        resolve(GdkPixbuf.Pixbuf.new_from_stream_finish(res));
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            
            let [success, buffer] = pixbuf.save_to_bufferv('png', [], []);
            if (success) {
                let gicon = Gio.BytesIcon.new(GLib.Bytes.new(buffer));
                this._menuArtIcon.gicon = gicon;
            }
        } catch (e) {
            console.error('Music Assistant: Failed to load art', e);
        }
    }

    _togglePlay() {
        let isPlaying = this._playerState.status === 'playing';
        this._sendCommand(isPlaying ? 'players/cmd/pause' : 'players/cmd/play');
    }

    _onVolumeChanged() {
        let volume = Math.round(this._volumeSlider.value * 100);
        let playerId = this._settings.get_string('player-id');
        if (!playerId) return;

        this._sendRaw({
            command: 'players/cmd/volume_set',
            args: { player_id: playerId, volume_level: volume },
            message_id: this._messageId++
        });
    }

    _sendCommand(command) {
        let playerId = this._settings.get_string('player-id');
        if (!playerId) return;

        this._sendRaw({
            command: command,
            args: { player_id: playerId },
            message_id: this._messageId++
        });
    }

    _sendRaw(obj) {
        if (!this._ws || this._ws.state !== Soup.WebsocketState.OPEN) return;
        let json = JSON.stringify(obj);
        this._ws.send_text(json);
    }
}
