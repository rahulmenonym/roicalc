
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.32.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/calc.svelte generated by Svelte v3.32.3 */

    const file = "src/calc.svelte";

    // (42:46) 
    function create_if_block_2(ctx) {
    	let div;
    	let t0;
    	let b;
    	let t1;
    	let t2;
    	let t3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("You could be saving ");
    			b = element("b");
    			t1 = text(/*mpw*/ ctx[3]);
    			t2 = text(" minutes");
    			t3 = text(" a week");
    			add_location(b, file, 43, 23, 1274);
    			add_location(div, file, 42, 2, 1245);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, b);
    			append_dev(b, t1);
    			append_dev(b, t2);
    			append_dev(div, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*mpw*/ 8) set_data_dev(t1, /*mpw*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(42:46) ",
    		ctx
    	});

    	return block;
    }

    // (38:49) 
    function create_if_block_1(ctx) {
    	let div;
    	let t0;
    	let b;
    	let t1;
    	let t2;
    	let t3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("You could be saving ");
    			b = element("b");
    			t1 = text(/*hpwr*/ ctx[5]);
    			t2 = text(" hours");
    			t3 = text(" a week");
    			add_location(b, file, 39, 23, 1160);
    			add_location(div, file, 38, 2, 1131);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, b);
    			append_dev(b, t1);
    			append_dev(b, t2);
    			append_dev(div, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*hpwr*/ 32) set_data_dev(t1, /*hpwr*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(38:49) ",
    		ctx
    	});

    	return block;
    }

    // (34:1) {#if ((no_hrp && qpw && tpq) && (hpw>1 && hpw<1.5))}
    function create_if_block(ctx) {
    	let div;
    	let t0;
    	let b;
    	let t1;
    	let t2;
    	let t3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("You could be saving ");
    			b = element("b");
    			t1 = text(/*hpwr*/ ctx[5]);
    			t2 = text(" hour");
    			t3 = text(" a week");
    			add_location(b, file, 35, 23, 1044);
    			add_location(div, file, 34, 2, 1015);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, b);
    			append_dev(b, t1);
    			append_dev(b, t2);
    			append_dev(div, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*hpwr*/ 32) set_data_dev(t1, /*hpwr*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(34:1) {#if ((no_hrp && qpw && tpq) && (hpw>1 && hpw<1.5))}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div1;
    	let h1;
    	let t1;
    	let div0;
    	let label0;
    	let t3;
    	let input0;
    	let t4;
    	let input1;
    	let t5;
    	let br0;
    	let br1;
    	let t6;
    	let label1;
    	let t8;
    	let input2;
    	let t9;
    	let input3;
    	let t10;
    	let label2;
    	let t12;
    	let input4;
    	let t13;
    	let input5;
    	let t14;
    	let br2;
    	let t15;
    	let br3;
    	let t16;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*no_hrp*/ ctx[0] && /*qpw*/ ctx[1] && /*tpq*/ ctx[2] && (/*hpw*/ ctx[4] > 1 && /*hpw*/ ctx[4] < 1.5)) return create_if_block;
    		if (/*no_hrp*/ ctx[0] && /*qpw*/ ctx[1] && /*tpq*/ ctx[2] && /*hpw*/ ctx[4] >= 1.5) return create_if_block_1;
    		if (/*no_hrp*/ ctx[0] && /*qpw*/ ctx[1] && /*tpq*/ ctx[2] && /*hpw*/ ctx[4] < 1) return create_if_block_2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Bumblebee ROI";
    			t1 = space();
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Number of HR Professionals";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			br0 = element("br");
    			br1 = element("br");
    			t6 = space();
    			label1 = element("label");
    			label1.textContent = "Average number of queries each HR professional gets a week";
    			t8 = space();
    			input2 = element("input");
    			t9 = space();
    			input3 = element("input");
    			t10 = space();
    			label2 = element("label");
    			label2.textContent = "Average time per query (in minutes)";
    			t12 = space();
    			input4 = element("input");
    			t13 = space();
    			input5 = element("input");
    			t14 = space();
    			br2 = element("br");
    			t15 = space();
    			br3 = element("br");
    			t16 = space();
    			if (if_block) if_block.c();
    			add_location(h1, file, 14, 4, 185);
    			attr_dev(label0, "for", "");
    			attr_dev(label0, "class", "svelte-y1n24v");
    			add_location(label0, file, 19, 8, 254);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "placeholder", "5");
    			attr_dev(input0, "inputmode", "numeric");
    			attr_dev(input0, "class", "svelte-y1n24v");
    			add_location(input0, file, 20, 8, 311);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", "1");
    			attr_dev(input1, "max", "50");
    			attr_dev(input1, "step", "1");
    			attr_dev(input1, "class", "svelte-y1n24v");
    			add_location(input1, file, 21, 8, 397);
    			add_location(br0, file, 22, 8, 464);
    			add_location(br1, file, 22, 12, 468);
    			attr_dev(label1, "for", "");
    			attr_dev(label1, "class", "svelte-y1n24v");
    			add_location(label1, file, 23, 8, 481);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "placeholder", "20");
    			attr_dev(input2, "inputmode", "numeric");
    			attr_dev(input2, "class", "svelte-y1n24v");
    			add_location(input2, file, 24, 8, 570);
    			attr_dev(input3, "type", "range");
    			attr_dev(input3, "min", "0");
    			attr_dev(input3, "max", "100");
    			attr_dev(input3, "step", "5");
    			attr_dev(input3, "class", "svelte-y1n24v");
    			add_location(input3, file, 25, 8, 654);
    			attr_dev(label2, "for", "");
    			attr_dev(label2, "class", "svelte-y1n24v");
    			add_location(label2, file, 26, 3, 714);
    			attr_dev(input4, "type", "number");
    			attr_dev(input4, "placeholder", "30");
    			attr_dev(input4, "inputmode", "numeric");
    			attr_dev(input4, "class", "svelte-y1n24v");
    			add_location(input4, file, 27, 8, 780);
    			attr_dev(input5, "type", "range");
    			attr_dev(input5, "min", "0");
    			attr_dev(input5, "max", "180");
    			attr_dev(input5, "step", "5");
    			attr_dev(input5, "class", "svelte-y1n24v");
    			add_location(input5, file, 28, 8, 864);
    			add_location(br2, file, 29, 8, 929);
    			attr_dev(div0, "class", "item svelte-y1n24v");
    			add_location(div0, file, 18, 4, 227);
    			add_location(br3, file, 32, 1, 954);
    			attr_dev(div1, "class", "flex svelte-y1n24v");
    			add_location(div1, file, 12, 0, 161);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h1);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t3);
    			append_dev(div0, input0);
    			set_input_value(input0, /*no_hrp*/ ctx[0]);
    			append_dev(div0, t4);
    			append_dev(div0, input1);
    			set_input_value(input1, /*no_hrp*/ ctx[0]);
    			append_dev(div0, t5);
    			append_dev(div0, br0);
    			append_dev(div0, br1);
    			append_dev(div0, t6);
    			append_dev(div0, label1);
    			append_dev(div0, t8);
    			append_dev(div0, input2);
    			set_input_value(input2, /*qpw*/ ctx[1]);
    			append_dev(div0, t9);
    			append_dev(div0, input3);
    			set_input_value(input3, /*qpw*/ ctx[1]);
    			append_dev(div0, t10);
    			append_dev(div0, label2);
    			append_dev(div0, t12);
    			append_dev(div0, input4);
    			set_input_value(input4, /*tpq*/ ctx[2]);
    			append_dev(div0, t13);
    			append_dev(div0, input5);
    			set_input_value(input5, /*tpq*/ ctx[2]);
    			append_dev(div0, t14);
    			append_dev(div0, br2);
    			append_dev(div1, t15);
    			append_dev(div1, br3);
    			append_dev(div1, t16);
    			if (if_block) if_block.m(div1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[6]),
    					listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[7]),
    					listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[7]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[8]),
    					listen_dev(input3, "change", /*input3_change_input_handler*/ ctx[9]),
    					listen_dev(input3, "input", /*input3_change_input_handler*/ ctx[9]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[10]),
    					listen_dev(input5, "change", /*input5_change_input_handler*/ ctx[11]),
    					listen_dev(input5, "input", /*input5_change_input_handler*/ ctx[11])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*no_hrp*/ 1 && to_number(input0.value) !== /*no_hrp*/ ctx[0]) {
    				set_input_value(input0, /*no_hrp*/ ctx[0]);
    			}

    			if (dirty & /*no_hrp*/ 1) {
    				set_input_value(input1, /*no_hrp*/ ctx[0]);
    			}

    			if (dirty & /*qpw*/ 2 && to_number(input2.value) !== /*qpw*/ ctx[1]) {
    				set_input_value(input2, /*qpw*/ ctx[1]);
    			}

    			if (dirty & /*qpw*/ 2) {
    				set_input_value(input3, /*qpw*/ ctx[1]);
    			}

    			if (dirty & /*tpq*/ 4 && to_number(input4.value) !== /*tpq*/ ctx[2]) {
    				set_input_value(input4, /*tpq*/ ctx[2]);
    			}

    			if (dirty & /*tpq*/ 4) {
    				set_input_value(input5, /*tpq*/ ctx[2]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);

    			if (if_block) {
    				if_block.d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let mpw;
    	let hpw;
    	let hpwr;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Calc", slots, []);
    	let no_hrp = 5;
    	let qpw = 20;
    	let tpq = 30;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Calc> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		no_hrp = to_number(this.value);
    		$$invalidate(0, no_hrp);
    	}

    	function input1_change_input_handler() {
    		no_hrp = to_number(this.value);
    		$$invalidate(0, no_hrp);
    	}

    	function input2_input_handler() {
    		qpw = to_number(this.value);
    		$$invalidate(1, qpw);
    	}

    	function input3_change_input_handler() {
    		qpw = to_number(this.value);
    		$$invalidate(1, qpw);
    	}

    	function input4_input_handler() {
    		tpq = to_number(this.value);
    		$$invalidate(2, tpq);
    	}

    	function input5_change_input_handler() {
    		tpq = to_number(this.value);
    		$$invalidate(2, tpq);
    	}

    	$$self.$capture_state = () => ({ no_hrp, qpw, tpq, mpw, hpw, hpwr });

    	$$self.$inject_state = $$props => {
    		if ("no_hrp" in $$props) $$invalidate(0, no_hrp = $$props.no_hrp);
    		if ("qpw" in $$props) $$invalidate(1, qpw = $$props.qpw);
    		if ("tpq" in $$props) $$invalidate(2, tpq = $$props.tpq);
    		if ("mpw" in $$props) $$invalidate(3, mpw = $$props.mpw);
    		if ("hpw" in $$props) $$invalidate(4, hpw = $$props.hpw);
    		if ("hpwr" in $$props) $$invalidate(5, hpwr = $$props.hpwr);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*no_hrp, qpw, tpq*/ 7) {
    			$$invalidate(3, mpw = no_hrp * qpw * tpq);
    		}

    		if ($$self.$$.dirty & /*mpw*/ 8) {
    			$$invalidate(4, hpw = mpw / 60);
    		}

    		if ($$self.$$.dirty & /*hpw*/ 16) {
    			$$invalidate(5, hpwr = Math.round(hpw));
    		}
    	};

    	return [
    		no_hrp,
    		qpw,
    		tpq,
    		mpw,
    		hpw,
    		hpwr,
    		input0_input_handler,
    		input1_change_input_handler,
    		input2_input_handler,
    		input3_change_input_handler,
    		input4_input_handler,
    		input5_change_input_handler
    	];
    }

    class Calc extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Calc",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.32.3 */
    const file$1 = "src/App.svelte";

    function create_fragment$1(ctx) {
    	let section;
    	let calc;
    	let current;
    	calc = new Calc({ $$inline: true });

    	const block = {
    		c: function create() {
    			section = element("section");
    			create_component(calc.$$.fragment);
    			attr_dev(section, "class", "svelte-1i4jxvi");
    			add_location(section, file$1, 4, 0, 55);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			mount_component(calc, section, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(calc.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(calc.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_component(calc);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Calc });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
