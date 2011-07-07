/* tooltipsy by Brian Cray
 *   modified version by Maurício Hanika
 * Lincensed under GPL2 - http://www.gnu.org/licenses/gpl-2.0.html
 * Option quick reference:
 *  - alignTo: "element" or "cursor" (Defaults to "element")
 *  - offset: Tooltipsy distance from element or mouse cursor, dependent on alignTo setting. Set as array [x, y] (Defaults to [0, -1])
 *  - content: HTML or text content of tooltip. Defaults to "" (empty string), which pulls content from target element's title attribute
 *  - show: function(event, tooltip) to show the tooltip. Defaults to a show(100) effect
 *  - hide: function(event, tooltip) to hide the tooltip. Defaults to a fadeOut(100) effect
 *  - delay: A delay in milliseconds before showing a tooltip. Set to 0 for no delay. Defaults to 200
 *  - css: object containing CSS properties and values. Defaults to {} to use stylesheet for styles
 *  - className: DOM class for styling tooltips with CSS. Defaults to "tooltipsy"
 * More information visit http://tooltipsy.com/
 */
 
(function($){
    "use strict";
    
    $.tooltipsy = function (el, options) {
        this.options = options;
        this.$el = $(el);
        this.title = this.$el.attr('title') || '';
        this.$el.attr('title', '');
        this.random = parseInt(Math.random()*10000);
        this.ready = false;
        this.shown = false;
        this.width = 0;
        this.height = 0;
        this.left = 0;
        this.top = 0;
        this.right = 0;
        this.bottom = 0;
        this.pos = [0, 0];
        this.posXRel = '';
        this.posYRel = '';
        this.delaytimer = null;
        this.delayouttimer = null;

        this.$el.data("tooltipsy", this);
        this.init();
    };

    $.tooltipsy.prototype.init = function () {
        var base = this;

        base.settings = $.extend(true, {}, base.defaults, base.options);
        base.settings.delay = parseInt(base.settings.delay);

        if (typeof base.settings.content === 'function') {
            base.readify(); 
        }
        
        base.$el.bind('mouseenter', function (e) {
            if (base.settings.delay > 0) {
                base.delaytimer = window.setTimeout(function () {
                    window.clearTimeout(base.delayouttimer);
                    base.delayouttimer = null;
                    base.enter(e);
                }, base.settings.delay);
            }
            else {
                window.clearTimeout(base.delayouttimer);
                base.delayouttimer = null;
                base.enter(e);
            }
        }).bind('mouseleave', function (e) {
            // if tooltip lays over root element, dont respond to mouse leave
            if($(e.relatedTarget).parents().filter(base.$tipsy).length > 0) {
                return false;
            }

            if(base.settings.delayOut > 0) {                
                window.clearTimeout(base.delaytimer);
                base.delaytimer = null;
                base.delayouttimer = window.setTimeout(function() {
                    base.leave(e);
                }, base.settings.delayOut);
            }
            else {
                window.clearTimeout(base.delaytimer);
                base.delaytimer = null;
                base.leave(e);
            }
        });
    };

    $.tooltipsy.prototype.enter = function (e) {
        var base = this;
        
        if (base.ready === false) {
            base.readify();
        }

        if (base.shown === false) {
            if ((function (o) {
                var s = 0, k;
                for (k in o) {
                    if (o.hasOwnProperty(k)) {
                        s++;
                    }
                }
                return s;
            })(base.settings.css) > 0) {
                base.$tip.css(base.settings.css);
            }
        }
        
        base.positions();

        base.shown = true;

        if (base.settings.alignTo === 'cursor') {
            this.pos = [e.pageX + base.settings.offset[0], e.pageY + base.settings.offset[1]];
            if(tip_position[0] + base.width > $(window).width()) {
                var tip_css = {top: tip_position[1] + 'px', right: tip_position[0] + 'px', left: 'auto'};
            }
            else {
                var tip_css = {top: tip_position[1] + 'px', left: tip_position[0] + 'px', right: 'auto'};
            }
        }
        else {
            this.pos = [this.getPosX(), this.getPosY()];
        }
        
        /**
         * The pointer position is calculated relative to the parent tooltip element
         */
        if(base.settings.pointer) {
            base.$pointer.position(this.pos);
        }
        else {
            base.$pointer.disable();
        }
        
        base.$tipsy.css({top: this.pos[1] + 'px', left: this.pos[0] + 'px'});
        base.settings.show(e, base.$tipsy.stop(true, true));
    };

    $.tooltipsy.prototype.positions = function() {
        var base = this;
        base.width = base.$tipsy.outerWidth();
        base.height = base.$tipsy.outerHeight();
        base.left = base.$tipsy.offset().left;
        base.top = base.$tipsy.offset().top;
        base.right = base.$tipsy.offset().left + base.width;
        base.bottom = base.$tipsy.offset().top + base.height;
        
        base.$el.width = base.$el.outerWidth();
        base.$el.height = base.$el.outerHeight();
        base.$el.left = base.$el.offset().left;
        base.$el.top = base.$el.offset().top;
        base.$el.right = base.$el.left + base.$el.width;
        base.$el.bottom = base.$el.top + base.$el.height;
        
        base.$el.center = {
            top: (function() {
                return base.$el.offset().top + Math.abs(base.$el.outerHeight() / 2);
            })(),
            left: (function() {
                return base.$el.offset().left + Math.abs(base.$el.outerWidth() / 2);
            })()
        };
    };

    /**
     * Retrieve optimized x position for tooltip
     **/
    $.tooltipsy.prototype.getPosX = function(pos) {
        var pos = this.settings.offset[0];
        if(! this.checkPosX()) {
            pos = this.getOptimizedPosX();
        }

        if(pos < 0) {
            this.posXRel = 'left';
            return this.$el.left - this.width + pos;
        }
        else if(pos === 0) {
            this.posXRel = 'center';
            return this.$el.left - Math.abs((this.width - this.$el.width) / 2);
        }
        else {
            this.posXRel = 'right';
            return this.$el.right + pos;
        }
    };

    /**
     * Check for valid x position
     */
    $.tooltipsy.prototype.checkPosX = function() {
        var pos = this.settings.offset[0],
            viewport_width = $(document).scrollLeft() + $(window).width();
        if(pos < 0 && this.$el.left < this.width) {
            return false;
        }
        else if(pos === 0 && (this.$el.left < (this.width / 2) || viewport_width < (this.$el.center.left + (this.width/ 2)))) {
            return false;   
        }
        else if(pos > 0 && viewport_width < (this.$el.right + this.width)) {
            return false;
        }
        else {
            return true;
        }
    }
    
    /**
     * Calculate optimized x position
     */
    $.tooltipsy.prototype.getOptimizedPosX = function() {
        var viewport_width = $(document).scrollLeft() + $(window).width();
        if(this.width < this.$el.left || this.width < (viewport_width - this.$el.right)) {
            var pos = (this.settings.offset[0] === 0 ? 1 : this.settings.offset[0]);
            
            if(this.$el.left > (viewport_width - this.$el.right)) {
                return -1 * Math.abs(pos);
            }
            else {
                return 1 * Math.abs(pos);
            }   
        }
        else {
            throw 'larger tooltip width than viewport not yet implemented';
        }
    }
    
    /**
     * Retrieve optimized y position
     */
    $.tooltipsy.prototype.getPosY = function() {
        var pos = this.settings.offset[1];
        if(! this.checkPosY()) {
            pos = this.getOptimizedPosY();
        }

        if(pos < 0) {
            this.posYRel = 'top';
            return this.$el.top - this.height + pos;
        }
        else if(pos === 0) {
            this.posYRel = 'center';
            return this.$el.top - ((this.height - this.$el.height) / 2);
        }
        else {
            this.posYRel = 'bottom';
            return this.$el.bottom;
        }
    }
    
    /**
     * Check for valid y position
     */
    $.tooltipsy.prototype.checkPosY = function() {
        var pos = this.settings.offset[1],
            viewport_height = $(document).scrollTop() + $(window).height();
        if(pos < 0 && this.$el.top < this.height) {
            return false;
        }
        else if(pos === 0 && (this.$el.center.top < (this.height / 2) || viewport_height < (this.$el.bottom + (this.height / 2)))) {
            return false;   
        }
        else if(pos > 0 && viewport_height < (this.$el.bottom + this.height)) {
            return false;
        }
        else {
            return true;
        }
    }

    /**
     * Calculate optimized y position
     */ 
    $.tooltipsy.prototype.getOptimizedPosY = function() {
        var viewport_height = $(document).scrollTop() + $(window).height();
        if(this.height < this.$el.top || this.height < (viewport_height - this.$el.bottom)) {
            var pos = (this.settings.offset[1] === 0 ? 1 : this.settings.offset[1]);        
            if(this.$el.top > (viewport_height - this.$el.bottom)) {
                return -1 * Math.abs(pos);
            }
            else {
                return 1 * Math.abs(pos);
            }
        }
        else {
            // get best y fit for tooltip
            throw 'larger tooltip height than viewport not yet implemented';
        }
    }

    $.tooltipsy.prototype.leave = function (e) {
        var base = this;

        if (e.relatedTarget === base.$tip[0]) {
            base.$tip.bind('mouseleave', function (e) {
                if (e.relatedTarget === base.$el[0]) {
                    return;
                }
                base.settings.hide(e, base.$tipsy.stop(true, true));
                tipsy_open = false;
            });
            return;
        }
        base.settings.hide(e, base.$tipsy.stop(true, true));
    };

    $.tooltipsy.prototype.readify = function () {
        var base = this;
        
        this.ready = true;
        
        if(base.settings.container !== '') {
            base.$tipsy = $(base.settings.container);
            base.$tip = base.$tipsy.children('.' + base.settings.classes.tip).first();
            base.$pointer = base.$tipsy.children('.' + base.settings.classes.pointer).first();
        }
        else {
            base.$tipsy = $('<div id="tooltipsy' + base.random + '" class="' + base.settings.classes.tipsy + '">').appendTo('body');
            base.$tip = $('<div class="' + base.settings.classes.tip + '">').appendTo(base.$tipsy).html(base.settings.content != '' ? base.settings.content : base.title); 
            base.$pointer = $('<div id="pointer' + base.random + '" style="position:absolute;" class="' + base.settings.classes.pointer + '">').appendTo(base.$tipsy);
        }
        
        base.$pointer = new $.tooltipsy.pointer(base.$pointer, this);
        
        base.$tipsy.css({display: 'none', position: 'absolute', zIndex: '2147483646'});
        
        base.$tipsy.hover(function() {
            window.clearTimeout(base.delayouttimer);
            base.$tipsy.css({zIndex: '2147483647'});
        }, function() {
            base.$el.mouseleave();
            base.$tipsy.css({zIndex: '2147483646'});
        });
    };

    $.tooltipsy.prototype.offset = function (el) {
        var ol = ot = 0;
        if (el.offsetParent) {
            do {
                ol += el.offsetLeft;
                ot += el.offsetTop;
            } while (el = el.offsetParent);
        }
        return {left : ol, top : ot};
    }

    $.tooltipsy.prototype.overlaps = function () {
        if((this.$tipsy.offset().left + this.$tipsy.outerWidth()) >= this.$el.center.left
            && (this.$tipsy.offset().top + this.$tipsy.outerHeight()) >= this.$el.center.top
            && this.$tipsy.offset().left <= this.$el.center.left
            && this.$tipsy.offset().top <= this.$el.center.top) {
            return true;
        }
        
        return false;
    } 

    $.tooltipsy.prototype.defaults = {
        alignTo: 'element',
        offset: [0, -1],
        pointerOffset: [0, 0],
        container: '',
        content: '',
        show: function (e, $el) {
            $el.fadeIn(100);
        },
        hide: function (e, $el) {
            $el.fadeOut(100);
        },
        css: {},
        classes: {
            tipsy: 'tooltipsy',
            tip: 'tip',
            pointer: 'pointer'
        },
        delay: 200,
        pointer: false
    };

    $.fn.tooltipsy = function(options) {   
        return this.each(function() {
            new $.tooltipsy(this, options);
        });
    };

    /**
     * Pointer
     */
    $.tooltipsy.pointer = function(el, tipsy) {
        this.$el = $(el);
        this.tipsy = tipsy;
        
        this.width = this.$el.outerWidth();
        this.height = this.$el.outerHeight();
    };
    
    $.tooltipsy.pointer.prototype.disable = function() {
        this.$el.hide();
    }
    
    $.tooltipsy.pointer.prototype.position = function(pos) {
        var left = this.getPosX(pos[0]),
            top = this.getPosY(pos[1]);
        this.$el.css({
            left: left + 'px',
            top: top + 'px',
            position: 'absolute'
        });
        
        this.$el.show();
    }
    
    $.tooltipsy.pointer.prototype.getPosX = function(pos) {
        var offset = this.tipsy.settings.pointerOffset[0];
        if(this.tipsy.posXRel == 'right') {
            this.tipsy.pos[0] += this.width;
            return -1 * (this.width + offset);
        }
        else if(this.tipsy.posXRel == 'center') {            
            return (this.tipsy.width / 2) - (this.width / 2) + offset;
        }
        else {
            this.tipsy.pos[0] -= this.width;
            return this.tipsy.width + this.width + offset;
        }
    }
    
    $.tooltipsy.pointer.prototype.getPosY = function(pos) {
        var offset = this.tipsy.settings.pointerOffset[1];
        if(this.tipsy.posYRel == 'bottom') {
            this.tipsy.pos[1] += this.height;
            return -1 * (this.height + offset);
        }
        else if(this.tipsy.posYRel == 'center') {
            return (this.tipsy.height / 2) - (this.height / 2) + offset;
        }
        else {
            this.tipsy.pos[1] -= this.height;
            return this.tipsy.height + offset;
        }
    }
})(jQuery);
