import Clutter from "gi://Clutter";
import GObject from "gi://GObject";
import Pango from "gi://Pango";
import St from "gi://St";
import GLib from "gi://GLib";

class ScrollingLabel extends St.ScrollView {
    constructor(params) {
        super({
            hscrollbarPolicy: St.PolicyType.NEVER,
            vscrollbarPolicy: St.PolicyType.NEVER,
        });
        const { text, width, isScrolling = true, scrollSpeed = 50, scrollPauseTime = 1000 } = params;
        
        this.isScrolling = isScrolling;
        this.labelWidth = width;
        this.scrollSpeed = scrollSpeed / 100;
        this.scrollPauseTime = scrollPauseTime;

        this.box = new St.BoxLayout({ xExpand: true, yExpand: true });
        this.label = new St.Label({
            text,
            yAlign: Clutter.ActorAlign.CENTER,
            xAlign: Clutter.ActorAlign.START,
        });
        
        this.box.add_child(this.label);
        this.add_child(this.box);

        if (this.isScrolling) {
            this.connect('notify::mapped', () => {
                if (this.is_mapped()) this._initScrolling();
            });
        }
    }

    _initScrolling() {
        const adjustment = this.get_hadjustment();
        if (this.label.width <= this.labelWidth) return;

        const origText = this.label.text + "     ";
        this.label.text = `${origText}${origText}`;
        this.label.clutterText.ellipsize = Pango.EllipsizeMode.NONE;

        const duration = (this.label.width / 2) / this.scrollSpeed;
        
        this.transition = new Clutter.PropertyTransition({
            propertyName: "value",
            progressMode: Clutter.AnimationMode.LINEAR,
            duration,
            repeatCount: -1,
        });
        
        this.transition.set_interval(new Clutter.Interval({
            valueType: GObject.TYPE_DOUBLE,
            initial: 0,
            final: this.label.width / 2
        }));

        adjustment.add_transition("scroll", this.transition);
    }

    updateText(text) {
        this.label.text = text;
        // Simple re-init if needed
    }
}

export default GObject.registerClass({ GTypeName: "MAScrollingLabel" }, ScrollingLabel);
