/* tooltipsy by Brian Cray
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
        this.delaytimer = null;
        this.delayouttimer = null;

        this.$el.data("tooltipsy", this);
        this.init();
    };

    $.tooltipsy.prototype.init = function () {
        var base = this;

        base.settings = $.extend({}, base.defaults, base.options);
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
            base.width = base.$tipsy.outerWidth();
            base.height = base.$tipsy.outerHeight();
            base.left = base.$tipsy.offset().left;
            base.top = base.$tipsy.offset().top;
            base.right = base.$tipsy.offset().left + base.width;
            base.bottom = base.$tipsy.offset().top + base.height;
            base.$el.center = {
                top: (function() {
                    return base.$el.offset().top + Math.abs(base.$el.outerHeight() / 2);
                })(),
                left: (function() {
                    return base.$el.offset().left + Math.abs(base.$el.outerWidth() / 2);
                })()
            };
        }

        base.shown = true;

        if (base.settings.alignTo === 'cursor') {
            var tip_position = [e.pageX + base.settings.offset[0], e.pageY + base.settings.offset[1]];
            if(tip_position[0] + base.width > $(window).width()) {
                var tip_css = {top: tip_position[1] + 'px', right: tip_position[0] + 'px', left: 'auto'};
            }
            else {
                var tip_css = {top: tip_position[1] + 'px', left: tip_position[0] + 'px', right: 'auto'};
            }
        }
        else {
            var tip_position = [this.getPosX(base.$el[0]), this.getPosY(base.offset(base.$el[0]))];
        }
        
        base.$tipsy.css({top: tip_position[1] + 'px', left: tip_position[0] + 'px'});
        base.settings.show(e, base.$tipsy.stop(true, true));
        
        var overlaps = base.overlaps();
        if(base.settings.pointer && ! overlaps) {
            base.$pointer.show();
        
            var pointer_position = [(function() {
                var tipsy_top = base.$tipsy.offset().top,
                    tipsy_bottom = base.$tipsy.offset().top + base.$tipsy.outerHeight(),
                    el_top = base.$el.offset().top,
                    el_bottom = base.$el.offset().top + base.$el.outerHeight();

                if(tipsy_bottom - base.$pointer.outerHeight() < el_top) {
                    // bottom
                    base.$pointer.data('facing', 's');
                    return tipsy_bottom;
                }
                else if(tipsy_top + base.$pointer.outerHeight() > el_bottom) {
                    // top
                    base.$pointer.data('facing', 'n');
                    return -1 * base.$pointer.outerHeight() + 1;
                }
                else {
                    // center
                    return base.$el.center.top - base.$tipsy.offset().top - Math.abs(base.$pointer.outerHeight() / 2);
                }
            })(),
            (function() {
                var tipsy_left = base.$tipsy.offset().left,
                    tipsy_right = base.$tipsy.offset().left + base.$tipsy.outerWidth(),
                    el_left = base.$el.offset().left,
                    el_right = base.$el.offset().left + base.$el.outerWidth(),
                    pointer_facing = base.$pointer.data('facing') ? base.$pointer.data('facing') : '';

                if(tipsy_left - base.$pointer.outerWidth() > el_right) {
                    // left
                    base.$pointer.data('facing', pointer_facing + 'w');
                    return -1 * base.$pointer.outerWidth();
                }
                else if(tipsy_right + base.$pointer.outerWidth() < el_left) {
                    // right
                    base.$pointer.data('facing', pointer_facing + 'e');
                    return base.$tipsy.outerWidth();
                }
                else {
                    return (base.$el.offset().left - base.$tipsy.offset().left) + ((base.$el.width() - base.$pointer.width()) / 2);
                }
            })()];

            base.$pointer.css({top: pointer_position[0], left: pointer_position[1]});
            base.$pointer.addClass('pointer-' + base.$pointer.data('facing'));
        }
        else {
            base.$pointer.hide();
        }
    };

    $.tooltipsy.prototype.getPosX = function(pos) {
        var tmpPos,
            offset = this.$el.offset(),
            pointer_width = (this.settings.pointer ? this.$pointer.outerWidth() : 0);
        if (this.settings.offset[0] < 0) {
            if(offset.left < this.$tipsy.outerWidth()) {
                return Math.abs(this.settings.offset[0]) + offset.left + this.$el.width() + pointer_width;
            }
            else {
                return offset.left - Math.abs(this.settings.offset[0]) - this.width - pointer_width;
            }
        }
        else if (this.settings.offset[0] === 0) {
            var viewport_width = $(window).width(),
                tipsy_outer_width = this.$tipsy.outerWidth(),
                tmpPos =  offset.left - ((this.width - this.$el.outerWidth()) / 2);
            if((tmpPos + tipsy_outer_width) > viewport_width) {
                tmpPos = viewport_width - tipsy_outer_width;
            }
            
            return tmpPos < 0 ? 0 : tmpPos;
        }
        else {
            if((offset.left + this.width) > $(window).width()) {
                return offset.left - this.width - Math.abs(this.settings.offset[0]) - pointer_width;
            }
            else {
                return offset.left + this.$el.outerWidth() + this.settings.offset[0] + pointer_width;
            }
        }
    };
    
    $.tooltipsy.prototype.getPosY = function(pos) {
        var pointer_height = (this.settings.pointer ? this.$pointer.outerHeight() : 0);
        
        if (this.settings.offset[1] < 0) {
            var viewport_height = $(window).height(),
                tipsy_outer_height = this.$tipsy.outerHeight(),
                tmpPos = pos.top - Math.abs(this.settings.offset[1]) - this.height;
            if((tmpPos + tipsy_outer_height) > viewport_height) {
                tmpPos = viewport_height - tipsy_outer_width;
            }
            return tmpPos < 0 ? 0 : tmpPos;
        }
        else if (this.settings.offset[1] === 0) {
            var tmpPos = pos.top - ((this.height - this.$el.outerHeight()) / 2);
            return tmpPos < 0 ? 0 : tmpPos;
        }
        else {
            var tipsy_top = pos.top + this.$el.outerHeight() + this.settings.offset[1] + pointer_height,
                tipsy_bottom = tipsy_top + this.$tipsy.outerHeight();
            if(tipsy_bottom > $(window).height()) {
                return pos.top - this.$tipsy.outerHeight() - this.$pointer.outerHeight();
            }
            else {
                return tipsy_top;
            }
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
        if(this.settings.container.tipsy && this.settings.container.tip && this.settings.container.pointer) {
          this.$tipsy = $(this.settings.container.tipsy);
          this.$tip = $(this.settings.container.tip);
          this.$pointer = $(this.settings.container.pointer);
          
          this.$tipsy.css({display: 'none', position: 'absolute', zIndex: '2147483646'});
        }
        else {
          this.$tipsy = $('<div id="tooltipsy' + this.random + '" style="position:absolute;z-index:2147483646;display:none">').appendTo('body');
          this.$tip = $('<div class="' + this.settings.className + '">').appendTo(this.$tipsy).html(this.settings.content != '' ? this.settings.content : this.title); 
          this.$pointer = $('<div id="pointer' + this.random + '" style="position:absolute;" class="pointer">').appendTo(this.$tipsy);
        }
        
        this.$tipsy.hover(function() {
          base.$tipsy.css({zIndex: '2147483647'});
        }, function() {
          base.$tipsy.css({zIndex: '2147483646'});
        });
        
        this.$tip.data('rootel', this.$el);
        this.$tipsy.hover(function() {
            window.clearTimeout(base.delayouttimer);
        }, function() {
            base.$el.mouseleave();
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
        container: {},
        content: '',
        show: function (e, $el) {
            $el.fadeIn(100);
        },
        hide: function (e, $el) {
            $el.fadeOut(100);
        },
        css: {},
        className: 'tooltipsy',
        delay: 200,
        pointer: false
    };

    $.fn.tooltipsy = function(options) {
        return this.each(function() {
            new $.tooltipsy(this, options);
        });
    };

})(jQuery);
